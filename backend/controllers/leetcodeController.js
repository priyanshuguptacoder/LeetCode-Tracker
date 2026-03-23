// updated: providerTitle always set on sync
const axios      = require('axios');
const Problem    = require('../models/Problem');
const Submission = require('../models/Submission');
const { rebuildStreak } = require('./problemController');
const { getUTCDayKey }  = require('../utils/statsEngine');

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
    tags:       normalizeTags((q.topicTags || []).map(t => t.name)),
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
  nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + interval);
  return { easeFactor, interval, reviewCount, nextReviewAt };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC TO PROBLEM COLLECTION
// Metadata ($set) always updated.
// Solved fields applied when: new doc OR existing doc not yet solved (e.g. Targeted).
// ═══════════════════════════════════════════════════════════════════════════════
function calculateNextRevision(fromDate, revisionCount) {
  const intervals = [1, 3, 7, 14, 30]; // days
  const days = intervals[Math.min(revisionCount, intervals.length - 1)];
  const d = new Date(fromDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function syncToProblemCollection(sub) {
  const existing = await Problem.findOne({ id: sub.problemId });

  const update = {
    $set: {
      title:           sub.title,
      difficulty:      sub.difficulty,
      topics:          sub.tags,
      submittedAt:     sub.last_updated_at,
      lastSubmittedAt: sub.dateSolved,   // always updated — tracks most recent sync timestamp
      leetcodeLink:    sub.link || `https://leetcode.com/problems/${sub.slug}/`,
      providerTitle:   'LeetCode',
      ...(sub.notes && { notes: sub.notes }),
    },
  };

  // Apply solved fields if new doc OR previously unsolved (e.g. Targeted problems)
  if (!existing || !existing.solved) {
    update.$set.solved        = true;
    update.$set.solvedDate    = sub.dateSolved;
    update.$set.nextRevisionAt = calculateNextRevision(sub.dateSolved, 0);
    update.$set.revisionCount = 0;
    update.$set.confidence    = 3;
  }

  await Problem.findOneAndUpdate(
    { id: sub.problemId },
    update,
    { upsert: true, new: true }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IST DAY WINDOW HELPERS — used only for "today's problems" display queries
// These bound the IST calendar day so the "Solved Today" list is correct for
// an IST user. Streak/activeDays computation uses UTC (matches LeetCode).
// ═══════════════════════════════════════════════════════════════════════════════
function getISTDayStart(date = new Date()) {
  // IST midnight = UTC 18:30 previous day
  const istOffset = 330 * 60 * 1000;
  const istNow = new Date(date.getTime() + istOffset);
  const istMidnight = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0, 0));
  return new Date(istMidnight.getTime() - istOffset);
}

function getISTDayEnd(date = new Date()) {
  const istOffset = 330 * 60 * 1000;
  const istNow = new Date(date.getTime() + istOffset);
  const istEndOfDay = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 23, 59, 59, 999));
  return new Date(istEndOfDay.getTime() - istOffset);
}

// Keep UTC versions as aliases for backward compat
function getUTCDayStart(date = new Date()) { return getISTDayStart(date); }
function getUTCDayEnd(date = new Date())   { return getISTDayEnd(date); }

// ═══════════════════════════════════════════════════════════════════════════════
// STREAK COMPUTATION — UTC-aware, walk-back algorithm
// ═══════════════════════════════════════════════════════════════════════════════
function computeStreaks(submissions) {
  if (!submissions.length) return { currentStreak: 0, longestStreak: 0, totalDays: 0 };

  const todayKey     = new Date().toISOString().split('T')[0];
  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const daySet = new Set(
    submissions
      .map(s => new Date(s.dateSolved).toISOString().split('T')[0])
      .filter(k => k && k <= todayKey)
  );

  const sortedKeys = [...daySet].sort();

  let longestStreak = 1, temp = 1;
  for (let i = 1; i < sortedKeys.length; i++) {
    const diff = (new Date(sortedKeys[i] + 'T00:00:00Z') - new Date(sortedKeys[i - 1] + 'T00:00:00Z')) / 86400000;
    if (diff === 1) { temp++; longestStreak = Math.max(longestStreak, temp); }
    else temp = 1;
  }
  longestStreak = Math.max(longestStreak, temp);

  const startKey = daySet.has(todayKey) ? todayKey : (daySet.has(yesterdayKey) ? yesterdayKey : null);
  let currentStreak = 0;
  if (startKey) {
    let cursor = new Date(startKey + 'T00:00:00Z');
    while (daySet.has(cursor.toISOString().split('T')[0])) {
      currentStreak++;
      cursor = new Date(cursor - 86400000);
    }
  }

  return { currentStreak, longestStreak, totalDays: daySet.size };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY HELPER
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchWithRetry(fn, retries = 3) {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(res => setTimeout(res, 500));
    return fetchWithRetry(fn, retries - 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAG NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
function normalizeTags(tags) {
  return (tags || []).map(tag => tag.toLowerCase().trim());
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
  if (!data || !data.data || !Array.isArray(list)) {
    throw new Error('LEETCODE_AUTH_FAILED');
  }

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
// FETCH USER CALENDAR — submission calendar from LeetCode (authenticated)
// Returns sorted array of YYYY-MM-DD IST strings for every day with a submission.
// LeetCode's submissionCalendar is a JSON string: { "unixTimestamp": count, ... }
// ═══════════════════════════════════════════════════════════════════════════════
const USER_CALENDAR_QUERY = `
  query userCalendar($username: String!) {
    matchedUser(username: $username) {
      userCalendar {
        submissionCalendar
        totalActiveDays
        streak
      }
    }
  }
`;

function parseSubmissionCalendar(jsonStr) {
  // jsonStr: '{"1609459200": 3, "1609545600": 1, ...}'
  // Keys are unix timestamps (seconds). LeetCode uses UTC day boundary.
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('[CALENDAR] Failed to parse submissionCalendar JSON:', e.message);
    return [];
  }

  const toUTCKey = (tsSeconds) => {
    return new Date(parseInt(tsSeconds, 10) * 1000).toISOString().split('T')[0];
  };

  const dateSet = new Set(Object.keys(parsed).map(toUTCKey));
  return [...dateSet].sort();
}

async function fetchUserCalendar() {
  const session  = process.env.LEETCODE_SESSION;
  const csrf     = process.env.LEETCODE_CSRF;
  const username = process.env.LEETCODE_USERNAME;

  if (!session || !csrf || !username) {
    throw new Error('LEETCODE_SESSION, LEETCODE_CSRF, LEETCODE_USERNAME env vars required');
  }

  const { data } = await axios.post(
    LC_GRAPHQL,
    { query: USER_CALENDAR_QUERY, variables: { username } },
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

  const calendar = data?.data?.matchedUser?.userCalendar;
  if (!calendar?.submissionCalendar) {
    throw new Error('userCalendar not found in LeetCode response');
  }

  const dates = parseSubmissionCalendar(calendar.submissionCalendar);
  console.log(`[CALENDAR] parsed ${dates.length} active days | LC totalActiveDays=${calendar.totalActiveDays} streak=${calendar.streak}`);
  return {
    dates,
    totalActiveDays: calendar.totalActiveDays,
    lcStreak:        calendar.streak,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// CORE SYNC: syncRecentSubmissions()
//
// USER INTENT LAYER — strict rules:
//   1. Check Problem collection by id/slug FIRST (including soft-deleted)
//   2. If isDeleted === true → SKIP (user intent lock — never resurrect)
//   3. If exists and not deleted → SKIP (already synced)
//   4. If not exists → INSERT via upsertProblem
//   5. If LeetCode API fails → abort entirely, do NOT modify DB
//   6. Fetch userCalendar and store submissionCalendarDates in Settings
//   7. Rebuild streak from submissionCalendar dates (matches LeetCode exactly)
//
// Returns: { fetched, inserted, skipped, dbTotal, errors, calendarDates }
// ═══════════════════════════════════════════════════════════════════════════════
async function syncRecentSubmissions() {
  console.log('[SYNC START] Fetching recent accepted submissions from LeetCode');

  // Step 1: Fetch submissions + calendar in parallel
  const [submissions, calendarResult] = await Promise.all([
    fetchWithRetry(() => fetchRecentAcceptedSubmissions()),
    fetchWithRetry(() => fetchUserCalendar()).catch(err => {
      console.warn('[SYNC] userCalendar fetch failed (non-fatal):', err.message);
      return null;
    }),
  ]);
  console.log(`[SYNC FETCHED ${submissions.length}] unique accepted slugs from LeetCode`);

  // Step 2: Store submissionCalendar dates in Settings (always, even if no new problems)
  let calendarDates = null;
  if (calendarResult && calendarResult.dates.length > 0) {
    calendarDates = calendarResult.dates;
    const Settings = require('../models/Settings');
    await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          submissionCalendarDates:     calendarDates,
          submissionCalendarUpdatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log(`[SYNC] Stored ${calendarDates.length} submissionCalendar dates in Settings`);
  }

  let inserted = 0, skipped = 0;
  const errors = [];

  // Step 3: Process each slug — strict intent-lock check
  for (const sub of submissions) {
    const slug = sub.titleSlug.toLowerCase().trim();
    try {
      const existingProblem = await Problem.findOne({
        leetcodeLink: { $regex: slug, $options: 'i' }
      }).lean();

      if (existingProblem) {
        if (existingProblem.isDeleted) {
          console.log(`[SYNC SKIP — INTENT LOCK] ${slug} — user deleted this problem`);
          skipped++;
          continue;
        }
        console.log(`[SYNC SKIPPED] ${slug} — already in DB`);
        skipped++;
        continue;
      }

      const existingSubmission = await Submission.findOne({ slug }).lean();
      if (existingSubmission) {
        if (existingSubmission.isDeleted) {
          console.log(`[SYNC SKIP — INTENT LOCK] ${slug} — submission deleted`);
          skipped++;
          continue;
        }
        console.log(`[SYNC SKIPPED] ${slug} — already in Submission DB`);
        skipped++;
        continue;
      }

      await upsertProblem(slug, { dateSolved: sub.timestamp });
      console.log(`[SYNC ADDED] ${slug}`);
      inserted++;

      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.error(`[SYNC ERROR] ${slug}: ${err.message}`);
      errors.push({ slug, error: err.message });
    }
  }

  // Step 4: Rebuild streak — always run, prefer submissionCalendar dates
  try {
    await rebuildStreak(calendarDates);
  } catch (e) {
    console.warn('[SYNC] Streak rebuild failed:', e.message);
  }

  const dbTotal      = await Submission.countDocuments({ isDeleted: { $ne: true } });
  const problemTotal = await Problem.countDocuments({ solved: true, isDeleted: { $ne: true } });

  console.log(`[SYNC COMPLETE] fetched=${submissions.length} inserted=${inserted} skipped=${skipped} errors=${errors.length}`);
  console.log(`[SYNC DB STATE] Submission: ${dbTotal} | Problem (solved): ${problemTotal}`);

  return { fetched: submissions.length, inserted, skipped, dbTotal, problemTotal, errors, calendarDates };
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

    const status = result.inserted > 0 ? 'updated' : 'up_to_date';
    return res.json({
      success: true,
      added:        result.inserted,
      status,
      dbTotal:      result.dbTotal,
      problemTotal: result.problemTotal,
      errors:       result.errors,
    });
  } catch (err) {
    console.error(`[ERROR] syncSubmissions: ${err.message}`);
    if (err.message === 'LEETCODE_AUTH_FAILED') {
      return res.status(401).json({ success: false, error: 'LEETCODE_SESSION_EXPIRED' });
    }
    return res.status(500).json({ success: false, error: 'SYNC_FAILED', detail: err.message });
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────
exports.upsertProblem         = upsertProblem;
exports.upsertManual          = upsertManual;
exports.syncRecentSubmissions = syncRecentSubmissions;

// POST /api/problem/sync/calendar — fetch & store submissionCalendar only (no problem inserts)
// Use this to backfill streak data without triggering a full sync.
exports.syncCalendar = async (req, res) => {
  if (!process.env.LEETCODE_SESSION || !process.env.LEETCODE_CSRF || !process.env.LEETCODE_USERNAME) {
    return res.status(500).json({ success: false, error: 'LEETCODE_SESSION, LEETCODE_CSRF, LEETCODE_USERNAME env vars required' });
  }
  try {
    const calendarResult = await fetchWithRetry(() => fetchUserCalendar());
    const calendarDates  = calendarResult.dates;

    const Settings = require('../models/Settings');
    await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          submissionCalendarDates:     calendarDates,
          submissionCalendarUpdatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Rebuild streak from calendar
    const { rebuildStreak } = require('./problemController');
    await rebuildStreak(calendarDates);

    return res.json({
      success:        true,
      activeDays:     calendarDates.length,
      lcActiveDays:   calendarResult.totalActiveDays,
      lcStreak:       calendarResult.lcStreak,
      calendarDates,
    });
  } catch (err) {
    console.error('[CALENDAR SYNC]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/sync/status — validates LeetCode session cookie is still active
exports.syncStatus = async (req, res) => {
  const session = process.env.LEETCODE_SESSION;
  const csrf    = process.env.LEETCODE_CSRF;

  if (!session || !csrf) {
    return res.json({ status: 'expired', reason: 'env_vars_missing' });
  }

  try {
    const { data } = await axios.post(
      LC_GRAPHQL,
      {
        query: `query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) { titleSlug }
        }`,
        variables: { username: process.env.LEETCODE_USERNAME || '', limit: 1 },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Referer':      'https://leetcode.com',
          'Cookie':       `LEETCODE_SESSION=${session}; csrftoken=${csrf}`,
          'x-csrftoken':  csrf,
        },
        timeout: 8000,
      }
    );

    if (!data?.data?.recentAcSubmissionList) {
      return res.json({ status: 'expired' });
    }
    return res.json({ status: 'ok' });
  } catch (err) {
    console.warn(`[SYNC STATUS] check failed: ${err.message}`);
    return res.json({ status: 'expired', reason: err.message });
  }
};

// GET /api/problem/recent — last 9 solved, sorted by lastSubmittedAt DESC
exports.getRecentProblems = async (req, res) => {
  try {
    const problems = await Problem.find({
      solved: true,
      isDeleted: { $ne: true },
      lastSubmittedAt: { $ne: null },
    })
      .sort({ lastSubmittedAt: -1 })
      .limit(9)
      .select('id title difficulty topics leetcodeLink lastSubmittedAt solvedDate')
      .lean();
    res.json({ success: true, data: problems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/problem/today — problems solved today (UTC day)
exports.getTodayProblems = async (req, res) => {
  try {
    const start = getUTCDayStart();
    const end   = getUTCDayEnd();
    const problems = await Problem.find({
      solved: true,
      isDeleted: { $ne: true },
      lastSubmittedAt: { $gte: start, $lte: end },
    })
      .sort({ lastSubmittedAt: -1 })
      .select('id title difficulty topics leetcodeLink lastSubmittedAt solvedDate')
      .lean();
    res.json({ success: true, data: problems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/problem/recent-and-today — combined single-request endpoint
// Returns: { recentSolved: [...max 9], todaySolved: [...], debug? }
exports.getRecentAndToday = async (req, res) => {
  try {
    const now           = new Date();
    const startOfDayUTC = getUTCDayStart(now);
    const endOfDayUTC   = getUTCDayEnd(now);
    const SELECT = 'id title difficulty topics leetcodeLink lastSubmittedAt solvedDate revisionCount lastRevisedAt isStriver targeted targetedAt needsRevision';

    const [recentSolved, todaySolved] = await Promise.all([
      Problem.find({ solved: true, isDeleted: { $ne: true }, lastSubmittedAt: { $ne: null } })
        .sort({ lastSubmittedAt: -1 })
        .limit(9)
        .select(SELECT)
        .lean(),

      Problem.find({ solved: true, isDeleted: { $ne: true }, lastSubmittedAt: { $gte: startOfDayUTC, $lte: endOfDayUTC } })
        .sort({ lastSubmittedAt: -1 })
        .select(SELECT)
        .lean(),
    ]);

    const debug = req.query.debug === 'true'
      ? { startOfDayUTC, endOfDayUTC, totalTodaySolved: todaySolved.length }
      : undefined;

    res.json({ success: true, recentSolved, todaySolved, debug });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
