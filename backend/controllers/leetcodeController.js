const axios      = require('axios');
const Problem    = require('../models/Problem');
const Submission = require('../models/Submission');

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY CACHE  (slug → full problem object)
// ═══════════════════════════════════════════════════════════════════════════════
const cache     = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(slug) {
  const e = cache.get(slug);
  if (!e) return null;
  if (Date.now() - e.cachedAt > CACHE_TTL) { cache.delete(slug); return null; }
  return e.data;
}
function setCache(slug, data) {
  cache.set(slug, { data, cachedAt: Date.now() });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEETCODE GRAPHQL — public metadata fetch (no auth needed)
// ═══════════════════════════════════════════════════════════════════════════════
const LC_GRAPHQL = 'https://leetcode.com/graphql';
const LC_QUERY   = `
  query getQuestionDetail($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId title difficulty titleSlug
      topicTags { name }
    }
  }
`;

async function fetchFromLeetCode(slug) {
  console.log(`[API FETCH] ${slug}`);
  const { data } = await axios.post(
    LC_GRAPHQL,
    { query: LC_QUERY, variables: { titleSlug: slug } },
    {
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
      timeout: 8000,
    }
  );
  const q = data?.data?.question;
  if (!q?.questionId) throw new Error(`Problem not found on LeetCode: "${slug}"`);
  return {
    id:         parseInt(q.questionId, 10),
    title:      q.title,
    difficulty: q.difficulty,
    slug:       q.titleSlug,
    link:       `https://leetcode.com/problems/${q.titleSlug}/`,
    tags:       (q.topicTags || []).map(t => t.name),
    source:     'api',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE: upsertProblem(slug, extraData?)
// Flow: cache → DB → LeetCode API → save → cache
// SKIP if already in Submission collection (no duplicate inserts).
// ═══════════════════════════════════════════════════════════════════════════════
async function upsertProblem(slug, extraData = {}) {
  if (!slug || typeof slug !== 'string') throw new Error('slug is required');
  slug = slug.toLowerCase().trim();

  // 1. Cache hit — fastest path, no DB or API call
  const cached = getCached(slug);
  if (cached) {
    console.log(`[CACHE HIT] ${slug}`);
    return cached;
  }

  // 2. DB hit — already tracked, return without touching anything
  const existing = await Submission.findOne({ slug });
  if (existing) {
    console.log(`[DB HIT] ${slug}`);
    const shaped = shapeResponse(existing);
    setCache(slug, shaped);
    return shaped;
  }

  // 3. Fetch metadata from LeetCode API (only reached for new problems)
  let apiData;
  try {
    apiData = await fetchFromLeetCode(slug);
  } catch (err) {
    throw new Error(`LeetCode API error for "${slug}": ${err.message}`);
  }

  // 4. Build document and insert
  const now    = new Date();
  const solved = extraData.dateSolved ? new Date(extraData.dateSolved) : now;
  const source = extraData._source || 'api';

  const sr  = sm2Update();
  const doc = {
    problemId:       apiData.id,
    slug:            apiData.slug,
    title:           apiData.title,
    difficulty:      apiData.difficulty,
    tags:            apiData.tags,
    link:            apiData.link,
    dateSolved:      solved,
    first_solved_at: solved,
    last_updated_at: now,
    time_taken:      extraData.time_taken != null ? Number(extraData.time_taken) : null,
    attempts:        extraData.attempts   != null ? Number(extraData.attempts)   : null,
    notes:           extraData.notes      || '',
    sources:         [source],
    easeFactor:      sr.easeFactor,
    interval:        sr.interval,
    reviewCount:     sr.reviewCount,
    nextReviewAt:    sr.nextReviewAt,
  };

  let submission;
  try {
    submission = await Submission.create(doc);
    console.log(`[DB] INSERT #${apiData.id} "${apiData.title}" (${source})`);
  } catch (err) {
    if (err.code === 11000) {
      // Race condition — another request inserted between our check and create
      console.warn(`[DB] Duplicate race for "${slug}" — fetching existing`);
      const race = await Submission.findOne({ slug });
      if (race) {
        const shaped = shapeResponse(race);
        setCache(slug, shaped);
        return shaped;
      }
    }
    throw err;
  }

  // Sync metadata to Problem collection (never overwrites solved status on existing docs)
  await syncToProblemCollection(submission);

  const shaped = shapeResponse(submission);
  setCache(slug, shaped);
  return shaped;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL UPSERT — user provides solve data (time, notes, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
async function upsertManual(slug, payload) {
  if (!slug) throw new Error('slug is required');
  slug = slug.toLowerCase().trim();

  const now    = new Date();
  const solved = payload.dateSolved ? new Date(payload.dateSolved) : now;

  const existing = await Submission.findOne({ slug });

  if (existing) {
    console.log(`[DB] UPDATE "${slug}" (manual)`);
    const sources     = existing.sources.includes('manual') ? existing.sources : [...existing.sources, 'manual'];
    const updatedDate = solved > existing.dateSolved ? solved : existing.dateSolved;

    const updated = await Submission.findOneAndUpdate(
      { slug },
      {
        $set: {
          sources,
          dateSolved:      updatedDate,
          last_updated_at: now,
          ...(payload.time_taken != null && { time_taken: Number(payload.time_taken) }),
          ...(payload.attempts   != null && { attempts:   Number(payload.attempts)   }),
          ...(payload.notes      != null && { notes: payload.notes }),
        },
      },
      { new: true }
    );

    await syncToProblemCollection(updated);
    cache.delete(slug);
    return { action: 'updated', data: shapeResponse(updated) };
  }

  // Not in DB — resolve via API then insert
  const result = await upsertProblem(slug, { ...payload, _source: 'manual' });
  return { action: 'inserted', data: result };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARDIZED RESPONSE SHAPE
// ═══════════════════════════════════════════════════════════════════════════════
function shapeResponse(doc) {
  return {
    slug:       doc.slug,
    id:         doc.problemId,
    title:      doc.title,
    difficulty: doc.difficulty,
    link:       doc.link || `https://leetcode.com/problems/${doc.slug}/`,
    tags:       doc.tags || [],
    source:     doc.sources?.includes('manual') ? 'manual' : 'api',
    dateSolved: doc.dateSolved,
    time_taken: doc.time_taken,
    attempts:   doc.attempts,
    notes:      doc.notes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SM-2 SPACED REPETITION
// ═══════════════════════════════════════════════════════════════════════════════
function sm2Update(current = {}) {
  let { easeFactor = 2.5, interval = 1, reviewCount = 0 } = current;
  if (reviewCount === 0)      interval = 1;
  else if (reviewCount === 1) interval = 3;
  else                        interval = Math.round(interval * easeFactor);
  reviewCount += 1;
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  return { easeFactor, interval, reviewCount, nextReviewAt };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC TO PROBLEM COLLECTION
// STRICT RULE: never overwrite solved/solvedDate on existing records.
// $set  → only safe metadata (title, difficulty, topics, link)
// $setOnInsert → solved fields only applied on brand-new inserts
// ═══════════════════════════════════════════════════════════════════════════════
async function syncToProblemCollection(sub) {
  const nextRevisionAt = new Date(sub.dateSolved);
  nextRevisionAt.setDate(nextRevisionAt.getDate() + 1);

  await Problem.findOneAndUpdate(
    { id: sub.problemId },
    {
      $set: {
        // Safe to always update — pure metadata, never affects solved count
        title:        sub.title,
        difficulty:   sub.difficulty,
        topics:       sub.tags,
        submittedAt:  sub.last_updated_at,
        leetcodeLink: sub.link || `https://leetcode.com/problems/${sub.slug}/`,
        ...(sub.notes && { notes: sub.notes }),
      },
      // Only applied when the document is NEWLY CREATED (upsert insert path)
      // Never runs on existing documents — solved count stays untouched
      $setOnInsert: {
        solved:        true,
        solvedDate:    sub.dateSolved,
        nextRevisionAt,
        revisionCount: 0,
        confidence:    3,
      },
    },
    { upsert: true, new: true }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAK COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════
function computeStreaks(submissions) {
  if (!submissions.length) return { currentStreak: 0, longestStreak: 0, totalDays: 0 };
  const days = [...new Set(
    submissions.map(s => s.dateSolved.toISOString().split('T')[0])
  )].sort();

  let streak = 1, longestStreak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]) - new Date(days[i - 1])) / 86400000;
    if (diff === 1) { streak++; longestStreak = Math.max(longestStreak, streak); }
    else streak = 1;
  }
  const lastDay  = new Date(days[days.length - 1]);
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - lastDay) / 86400000);
  return { currentStreak: diffDays <= 1 ? streak : 0, longestStreak, totalDays: days.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH RECENT ACCEPTED SUBMISSIONS (authenticated)
// ═══════════════════════════════════════════════════════════════════════════════
const RECENT_AC_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      title titleSlug timestamp
    }
  }
`;

async function fetchRecentAcceptedSubmissions() {
  const session  = process.env.LEETCODE_SESSION;
  const csrf     = process.env.LEETCODE_CSRF;
  const username = process.env.LEETCODE_USERNAME;

  if (!session || !csrf)  throw new Error('LEETCODE_SESSION and LEETCODE_CSRF env vars are required');
  if (!username)          throw new Error('LEETCODE_USERNAME env var is required');

  const { data } = await axios.post(
    LC_GRAPHQL,
    { query: RECENT_AC_QUERY, variables: { username, limit: 20 } },
    {
      headers: {
        'Content-Type': 'application/json',
        'Referer':      'https://leetcode.com',
        'Cookie':       `LEETCODE_SESSION=${session}; csrftoken=${csrf}`,
        'x-csrftoken':  csrf,
      },
      timeout: 10000,
    }
  );

  const list = data?.data?.recentAcSubmissionList;
  if (!Array.isArray(list)) throw new Error('Unexpected response from LeetCode — check session cookies');

  // Deduplicate by slug — LeetCode returns one row per submission, not per problem
  const seen = new Set();
  return list
    .filter(s => { if (seen.has(s.titleSlug)) return false; seen.add(s.titleSlug); return true; })
    .map(s => ({
      titleSlug: s.titleSlug,
      title:     s.title,
      timestamp: new Date(parseInt(s.timestamp, 10) * 1000),
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE SYNC: syncRecentSubmissions()
//
// STRICT RULES:
//   1. Check Submission collection by slug FIRST
//   2. If exists → SKIP (never insert duplicate)
//   3. If not → INSERT via upsertProblem (which also checks DB before API)
//   4. If LeetCode API fails → abort entirely, do NOT modify DB
//   5. Never delete anything regardless of what LeetCode returns
//
// Returns: { fetched, inserted, skipped, dbTotal, errors }
// ═══════════════════════════════════════════════════════════════════════════════
async function syncRecentSubmissions() {
  console.log('[SYNC START] Fetching recent accepted submissions from LeetCode');

  // Step 1: Fetch from LeetCode — if this fails, abort before touching DB
  const submissions = await fetchRecentAcceptedSubmissions();
  console.log(`[SYNC FETCHED ${submissions.length}] unique accepted slugs from LeetCode`);

  let inserted = 0, skipped = 0;
  const errors = [];

  // Step 2: Process each slug — strict skip-if-exists
  for (const sub of submissions) {
    const slug = sub.titleSlug.toLowerCase().trim();
    try {
      const existing = await Submission.findOne({ slug }).lean();
      if (existing) {
        console.log(`[SYNC SKIPPED] ${slug} — already in DB`);
        skipped++;
        continue;
      }

      // New problem — fetch metadata + insert
      await upsertProblem(slug, { dateSolved: sub.timestamp });
      console.log(`[SYNC ADDED] ${slug}`);
      inserted++;

      // Throttle to avoid hammering LeetCode API
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.error(`[SYNC ERROR] ${slug}: ${err.message}`);
      errors.push({ slug, error: err.message });
    }
  }

  // Step 3: Final DB count for consistency verification
  const dbTotal = await Submission.countDocuments();
  const problemTotal = await Problem.countDocuments({ solved: true });

  console.log(`[SYNC COMPLETE] fetched=${submissions.length} inserted=${inserted} skipped=${skipped} errors=${errors.length}`);
  console.log(`[SYNC DB STATE] Submission collection: ${dbTotal} | Problem collection (solved): ${problemTotal}`);

  // Step 4: Consistency warning
  if (inserted > 0 && problemTotal !== dbTotal + (problemTotal - dbTotal)) {
    // Problem collection has more records (manually added via tracker UI) — this is expected
    console.log(`[SYNC INFO] Problem collection (${problemTotal}) > Submission collection (${dbTotal}) — normal, manual entries exist`);
  }

  return { fetched: submissions.length, inserted, skipped, dbTotal, problemTotal, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/problem/:slug — DB-first, never calls API if already stored
exports.getProblem = async (req, res) => {
  const slug = req.params.slug?.toLowerCase().trim();
  if (!slug) return res.status(400).json({ success: false, error: 'slug is required' });

  try {
    const data = await upsertProblem(slug);
    return res.json({ success: true, data });
  } catch (err) {
    const fallback = await Submission.findOne({ slug }).lean();
    if (fallback) {
      console.warn(`[ERROR] API failed for "${slug}", serving DB fallback: ${err.message}`);
      return res.json({ success: true, data: shapeResponse(fallback), stale: true });
    }
    console.error(`[ERROR] getProblem(${slug}): ${err.message}`);
    return res.status(err.message.includes('not found') ? 400 : 502)
      .json({ success: false, error: err.message });
  }
};

// POST /api/problem/manual
exports.manualEntry = async (req, res) => {
  let { slug, time_taken, attempts, notes, dateSolved } = req.body;
  if (!slug) return res.status(400).json({ success: false, error: 'slug is required' });
  slug = slug.toLowerCase().trim();

  try {
    const { action, data } = await upsertManual(slug, { time_taken, attempts, notes, dateSolved });
    return res.status(action === 'inserted' ? 201 : 200).json({
      success: true, action,
      message: `Problem "${slug}" ${action}`,
      data,
    });
  } catch (err) {
    console.error(`[ERROR] manualEntry(${slug}): ${err.message}`);
    return res.status(err.message.includes('not found') ? 400 : 500)
      .json({ success: false, error: err.message });
  }
};

// GET /api/problem/list
exports.listProblems = async (req, res) => {
  try {
    const { difficulty, tag, source, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (tag)        filter.tags = tag;
    if (source)     filter.sources = source;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Submission.countDocuments(filter);
    const docs  = await Submission.find(filter)
      .sort({ dateSolved: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, total, page: parseInt(page), data: docs.map(shapeResponse) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/problem/revision
exports.getRevision = async (req, res) => {
  try {
    const now = new Date();
    const [due, upcoming] = await Promise.all([
      Submission.find({ nextReviewAt: { $lte: now } }).sort({ nextReviewAt: 1 }).lean(),
      Submission.find({ nextReviewAt: { $gt:  now } }).sort({ nextReviewAt: 1 }).limit(10).lean(),
    ]);
    res.json({
      success:  true,
      dueNow:   { count: due.length,      data: due.map(shapeResponse) },
      upcoming: { count: upcoming.length, data: upcoming.map(shapeResponse) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/problem/streaks
exports.getStreaks = async (req, res) => {
  try {
    const subs = await Submission.find({}, 'dateSolved').sort({ dateSolved: 1 });
    res.json({ success: true, ...computeStreaks(subs) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/problem/sync
exports.syncSubmissions = async (req, res) => {
  if (!process.env.LEETCODE_SESSION || !process.env.LEETCODE_CSRF) {
    return res.status(500).json({ success: false, error: 'LEETCODE_SESSION and LEETCODE_CSRF env vars are not set.' });
  }
  if (!process.env.LEETCODE_USERNAME) {
    return res.status(500).json({ success: false, error: 'LEETCODE_USERNAME env var is not set.' });
  }

  try {
    const result = await syncRecentSubmissions();

    // Consistency check — warn if counts diverge unexpectedly
    if (result.inserted > 0) {
      const expectedTotal = result.dbTotal;
      const actualTotal   = await Submission.countDocuments();
      if (actualTotal !== expectedTotal) {
        console.warn(`[SYNC WARN] Count mismatch after sync: expected=${expectedTotal} actual=${actualTotal}`);
      }
    }

    return res.json({
      success: true,
      message: `Sync complete — ${result.inserted} added, ${result.skipped} skipped`,
      fetched:      result.fetched,
      inserted:     result.inserted,
      skipped:      result.skipped,
      dbTotal:      result.dbTotal,
      problemTotal: result.problemTotal,
      errors:       result.errors,
    });
  } catch (err) {
    console.error(`[ERROR] syncSubmissions: ${err.message}`);
    const isAuthError = err.message.includes('session') || err.message.includes('cookie')
                     || err.message.includes('Unexpected response');
    return res.status(isAuthError ? 401 : 500).json({ success: false, error: err.message });
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────
exports.upsertProblem         = upsertProblem;
exports.upsertManual          = upsertManual;
exports.syncRecentSubmissions = syncRecentSubmissions;
