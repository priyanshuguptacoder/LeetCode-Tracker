const crypto      = require('crypto');
const { Octokit } = require('@octokit/rest');
const Problem     = require('../models/Problem');
const Submission  = require('../models/Submission');
const { getMetadata } = require('../data/problemMetadata');

// ─── Octokit factory ──────────────────────────────────────────────────────────
function getOctokit() {
  return new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });
}

// ─── Repo tree cache (5-min TTL) ─────────────────────────────────────────────
const treeCache  = new Map();
const CACHE_TTL  = 5 * 60 * 1000;

function getCachedTree(key) {
  const e = treeCache.get(key);
  if (!e) return null;
  if (Date.now() - e.fetchedAt > CACHE_TTL) { treeCache.delete(key); return null; }
  return e.tree;
}
function setCachedTree(key, tree) {
  treeCache.set(key, { tree, fetchedAt: Date.now() });
}

// ─── Language detection ───────────────────────────────────────────────────────
const EXT_TO_LANG = {
  js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java',
  cpp: 'C++', c: 'C', cs: 'C#', go: 'Go', rs: 'Rust', rb: 'Ruby',
  kt: 'Kotlin', swift: 'Swift', scala: 'Scala', php: 'PHP', sql: 'SQL',
};
function detectLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return EXT_TO_LANG[ext] || null;
}

// ─── Parse slug: "0001-two-sum.js" → { problemId, slug, title } ──────────────
// parseSlug handles two repo layouts:
//   1. Filename-based: "0001-two-sum.js"         → ID from filename
//   2. Folder-based:   "459-two-sum/solution.cpp" → ID from folder name
// Pass the full file path so we can fall back to the folder name.
function parseSlug(filePathOrName) {
  const parts    = filePathOrName.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1];
  const folder   = parts.length >= 2 ? parts[parts.length - 2] : null;

  function extract(str) {
    const base  = str.replace(/\.[^.]+$/, ''); // strip extension
    const match = base.match(/^0*(\d+)[-_\s]+(.+)$/);
    if (!match) return null;
    const problemId = parseInt(match[1], 10);
    if (isNaN(problemId) || problemId <= 0) return null;
    const rawSlug = match[2].replace(/[_\s]+/g, '-').toLowerCase();
    const title   = rawSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { problemId, slug: rawSlug, title };
  }

  // Try filename first, then folder name
  return extract(filename) || (folder ? extract(folder) : null);
}

// ─── Normalize problemId: accept string or number, return integer ─────────────
function normalizeProblemId(raw) {
  const id = parseInt(raw, 10);
  if (isNaN(id) || id <= 0) return null;
  return id;
}

// ─── SM-2 spaced repetition ───────────────────────────────────────────────────
function sm2Update(current, quality = 3) {
  let { easeFactor = 2.5, interval = 1, reviewCount = 0 } = current;
  if (quality >= 3) {
    if (reviewCount === 0)      interval = 1;
    else if (reviewCount === 1) interval = 3;
    else                        interval = Math.round(interval * easeFactor);
  } else {
    interval = 1;
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  reviewCount += 1;
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  return { easeFactor: parseFloat(easeFactor.toFixed(2)), interval, reviewCount, nextReviewAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: mergeUpsert — single source of truth for all inserts/updates
//
// source: 'github' | 'manual'
// payload fields:
//   problemId (required), title, slug, difficulty, tags, language,
//   dateSolved, time_taken, attempts, notes, code_path, commitSha, repoName,
//   solutionEntry { language, filePath, commitSha, committedAt }
// ─────────────────────────────────────────────────────────────────────────────
async function mergeUpsert(source, payload) {
  // exported below for use by debugController
  const problemId = normalizeProblemId(payload.problemId);
  if (!problemId) throw new Error(`Invalid problemId: ${payload.problemId}`);

  const meta     = getMetadata(problemId);
  const now      = new Date();
  const existing = await Submission.findOne({ problemId });

  if (existing) {
    // ── UPDATE path ──────────────────────────────────────────────────────────
    console.log(`[DB] UPDATE problem_id: ${problemId} — "${existing.title}" (source: ${source})`);

    // Merge sources array — add new source if not already present
    const sources = existing.sources.includes(source)
      ? existing.sources
      : [...existing.sources, source];

    // Keep earliest dateSolved as first_solved_at (immutable after first set)
    const incomingDate   = payload.dateSolved ? new Date(payload.dateSolved) : now;
    const first_solved_at = existing.first_solved_at || incomingDate;

    // Update dateSolved only if incoming is newer
    const dateSolved = incomingDate > existing.dateSolved ? incomingDate : existing.dateSolved;

    // Manual entry overrides time_taken / attempts if provided
    const time_taken = (source === 'manual' && payload.time_taken != null)
      ? payload.time_taken
      : existing.time_taken;

    const attempts = (source === 'manual' && payload.attempts != null)
      ? payload.attempts
      : existing.attempts;

    // Merge notes — append if manual adds new content
    let notes = existing.notes || '';
    if (source === 'manual' && payload.notes && payload.notes !== existing.notes) {
      notes = payload.notes; // manual always wins on notes
    }

    // Merge solutions array — add if filePath not already tracked
    let solutions = existing.solutions || [];
    if (payload.solutionEntry) {
      const alreadyTracked = solutions.some(s => s.filePath === payload.solutionEntry.filePath);
      if (!alreadyTracked) solutions = [...solutions, payload.solutionEntry];
    }

    // GitHub provides code_path; keep it if manual doesn't override
    const code_path = (source === 'github' && payload.code_path)
      ? payload.code_path
      : existing.code_path;

    const updated = await Submission.findOneAndUpdate(
      { problemId },
      {
        $set: {
          sources,
          dateSolved,
          first_solved_at,
          last_updated_at: now,
          time_taken,
          attempts,
          notes,
          solutions,
          code_path,
          ...(payload.commitSha && { commitSha: payload.commitSha }),
          ...(payload.repoName  && { repoName:  payload.repoName  }),
          ...(payload.language  && !existing.language && { language: payload.language }),
        }
      },
      { new: true }
    );

    await syncToProblemCollection(updated);
    return { action: 'updated', problemId, title: updated.title };

  } else {
    // ── INSERT path ──────────────────────────────────────────────────────────
    console.log(`[DB] INSERT problem_id: ${problemId} — "${payload.title}" (source: ${source})`);

    const dateSolved     = payload.dateSolved ? new Date(payload.dateSolved) : now;
    const first_solved_at = dateSolved;
    const sr             = sm2Update({});

    const doc = {
      problemId,
      slug:        payload.slug       || '',
      title:       payload.title      || `Problem #${problemId}`,
      difficulty:  meta?.difficulty   || payload.difficulty || 'Medium',
      tags:        meta?.tags         || payload.tags       || [],
      language:    payload.language   || null,
      dateSolved,
      first_solved_at,
      last_updated_at: now,
      time_taken:  payload.time_taken  ?? null,
      attempts:    payload.attempts    ?? null,
      notes:       payload.notes       || '',
      sources:     [source],
      code_path:   payload.code_path   || null,
      commitSha:   payload.commitSha   || null,
      repoName:    payload.repoName    || null,
      solutions:   payload.solutionEntry ? [payload.solutionEntry] : [],
      easeFactor:  sr.easeFactor,
      interval:    sr.interval,
      reviewCount: sr.reviewCount,
      nextReviewAt: sr.nextReviewAt,
    };

    let submission;
    try {
      submission = await Submission.create(doc);
    } catch (err) {
      // Duplicate key — race condition safety net: fall back to update
      if (err.code === 11000) {
        console.warn(`[DB] Duplicate key caught for problem_id: ${problemId} — falling back to update`);
        return mergeUpsert(source, payload);
      }
      throw err;
    }

    await syncToProblemCollection(submission);
    return { action: 'inserted', problemId, title: submission.title };
  }
}

// ─── Keep main Problem collection in sync ────────────────────────────────────
async function syncToProblemCollection(sub) {
  const nextRevisionAt = new Date(sub.dateSolved);
  nextRevisionAt.setDate(nextRevisionAt.getDate() + 1);

  await Problem.findOneAndUpdate(
    { id: sub.problemId },
    {
      $set: {
        title:         sub.title,
        difficulty:    sub.difficulty,
        topics:        sub.tags,
        solved:        true,
        solvedDate:    sub.dateSolved,
        submittedAt:   sub.last_updated_at,
        nextRevisionAt,
        ...(sub.slug && { leetcodeLink: `https://leetcode.com/problems/${sub.slug}/` }),
        ...(sub.notes && { notes: sub.notes }),
      },
      $setOnInsert: { revisionCount: 0, confidence: 3 },
    },
    { upsert: true, new: true }
  );
}

// ─── Repo tree fetch ──────────────────────────────────────────────────────────
async function getRepoTree(octokit, owner, repo, branch = 'main', useCache = true) {
  const key = `${owner}/${repo}@${branch}`;
  if (useCache) {
    const cached = getCachedTree(key);
    if (cached) { console.log(`[WEBHOOK] Cache hit: ${key}`); return cached; }
  }
  console.log(`[WEBHOOK] Fetching tree: ${key}`);
  const { data } = await octokit.git.getTree({ owner, repo, tree_sha: branch, recursive: '1' });
  if (data.truncated) console.warn(`[WEBHOOK] Tree truncated for ${key}`);
  const tree = data.tree.filter(f => f.type === 'blob');
  setCachedTree(key, tree);
  return tree;
}

// ─── Get latest commit date for a file ───────────────────────────────────────
async function getFileCommitDate(octokit, owner, repo, path, ref) {
  try {
    const { data } = await octokit.repos.listCommits({ owner, repo, path, sha: ref, per_page: 1 });
    if (data.length > 0) return new Date(data[0].commit.committer.date);
  } catch (e) {
    console.warn(`[WEBHOOK] Could not get commit date for ${path}: ${e.message}`);
  }
  return new Date();
}

// ─── Compute streaks from submission dates (IST-aware) ───────────────────────
function computeStreaks(submissions) {
  if (!submissions.length) return { currentStreak: 0, longestStreak: 0, totalDays: 0 };
  const toISTKey = (d) => {
    const ist = new Date(new Date(d).getTime() + 330 * 60 * 1000);
    return ist.getUTCFullYear() + '-' +
      String(ist.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(ist.getUTCDate()).padStart(2, '0');
  };
  const todayKey     = toISTKey(new Date());
  const yesterdayKey = toISTKey(new Date(Date.now() - 86400000));

  const daySet = new Set(
    submissions.map(s => toISTKey(s.dateSolved)).filter(k => k <= todayKey)
  );
  const days = [...daySet].sort();

  let longestStreak = 1, temp = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i] + 'T00:00:00Z') - new Date(days[i - 1] + 'T00:00:00Z')) / 86400000;
    if (diff === 1) { temp++; longestStreak = Math.max(longestStreak, temp); }
    else temp = 1;
  }
  longestStreak = Math.max(longestStreak, temp);

  // Current streak — alive if solved today OR yesterday
  const startKey = daySet.has(todayKey) ? todayKey : (daySet.has(yesterdayKey) ? yesterdayKey : null);
  let currentStreak = 0;
  if (startKey) {
    let cursor = new Date(startKey + 'T00:00:00Z');
    while (daySet.has(toISTKey(cursor))) {
      currentStreak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }
  return { currentStreak, longestStreak, totalDays: daySet.size };
}

// ─── HMAC verification ───────────────────────────────────────────────────────
function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true;
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const hmac   = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const digest = 'sha256=' + hmac.digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest)); }
  catch { return false; }
}

// ─── Extract changed slug-pattern files from push commits ────────────────────
function extractChangedFiles(commits) {
  const files = new Map();

  // Pattern 1: filename has ID  — "0001-two-sum.js" or "1-two-sum.py"
  const filePattern   = /(?:^|\/)0*\d+[-_][a-z0-9-_]+\.[a-z]+$/i;
  // Pattern 2: folder has ID   — "459-two-sum/anything.cpp"
  const folderPattern = /(?:^|\/)0*\d+[-_][a-z0-9-_]+\/[^/]+\.[a-z]+$/i;

  for (const commit of commits) {
    for (const f of [...(commit.added || []), ...(commit.modified || [])]) {
      if (f.endsWith('.md') || f.includes('README')) continue;
      if (filePattern.test(f) || folderPattern.test(f)) {
        files.set(f, commit.id);
      }
    }
  }
  return [...files.entries()].map(([path, sha]) => ({ path, sha }));
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

// ─── POST /api/github-sync — Webhook ─────────────────────────────────────────
exports.handleWebhook = async (req, res) => {
  if (!verifySignature(req))
    return res.status(401).json({ success: false, error: 'Invalid webhook signature' });

  const event = req.headers['x-github-event'];
  console.log(`[WEBHOOK] Received push event: ${event}`);

  if (event !== 'push')
    return res.json({ success: true, message: `Ignored event: ${event}` });

  const { repository, commits, head_commit, ref } = req.body;
  if (!repository || !commits?.length)
    return res.json({ success: true, message: 'No commits to process' });

  const owner     = repository.owner?.login || repository.full_name.split('/')[0];
  const repoName  = repository.name;
  const branch    = ref?.replace('refs/heads/', '') || 'main';
  const commitSha = head_commit?.id || null;

  console.log(`[WEBHOOK] Push to ${owner}/${repoName}@${branch} — ${commits.length} commit(s)`);
  commits.forEach((c, i) => {
    console.log(`[WEBHOOK]   commit[${i}] ${c.id?.slice(0, 7)} added:${(c.added||[]).length} modified:${(c.modified||[]).length}`);
  });

  const changedFiles = extractChangedFiles(commits);
  console.log(`[WEBHOOK] Files changed: ${changedFiles.map(f => f.path).join(', ') || 'none'}`);
  console.log(`[WEBHOOK] Commits count: ${commits.length}`);

  if (!changedFiles.length)
    return res.json({ success: true, message: 'No problem files changed' });

  treeCache.delete(`${owner}/${repoName}@${branch}`);

  // Update shared sync state (read by health endpoint)
  try {
    const { syncState } = require('./debugController');
    syncState.last_sync  = new Date().toISOString();
    syncState.last_event = event;
    syncState.webhook_hits += 1;
  } catch (_) { /* debugController may not be loaded yet */ }

  const octokit = getOctokit();
  const results = { synced: [], skipped: [], errors: [] };

  for (const { path, sha } of changedFiles) {
    const parsed = parseSlug(path); // pass full path so folder name is available
    if (!parsed) {
      console.warn(`[PARSE] Could not extract problem_id from: ${path}`);
      results.skipped.push({ path, reason: 'Could not parse slug' });
      continue;
    }
    console.log(`[PARSE] Extracted problem_id: ${parsed.problemId} — "${parsed.title}" from ${path}`);

    try {
      const dateSolved = await getFileCommitDate(octokit, owner, repoName, path, sha || branch);
      const result = await mergeUpsert('github', {
        ...parsed,
        dateSolved,
        language:      detectLanguage(path),
        code_path:     path,
        commitSha:     sha || commitSha,
        repoName,
        solutionEntry: { language: detectLanguage(path), filePath: path, commitSha: sha || commitSha, committedAt: dateSolved },
      });
      results.synced.push(result);
      if (result.action === 'inserted') {
        console.log(`[DB] INSERT problem_id: ${result.problemId} — "${result.title}" (webhook)`);
      } else {
        console.log(`[DB] UPDATE problem_id: ${result.problemId} — "${result.title}" (webhook)`);
      }
    } catch (err) {
      results.errors.push({ path, error: err.message });
      console.error(`[ERROR] GitHub sync failed for ${path}: ${err.message}`);
    }
  }

  return res.json({ success: true, message: `Processed ${changedFiles.length} file(s)`, results });
};

// ─── POST /api/github-sync/manual — Full repo sync ───────────────────────────
exports.manualSync = async (req, res) => {
  const { owner, repo, branch = 'main' } = req.body;
  if (!owner || !repo)
    return res.status(400).json({ success: false, error: 'owner and repo are required' });

  const octokit     = getOctokit();
  const results     = { synced: [], skipped: [], errors: [] };

  try {
    const tree         = await getRepoTree(octokit, owner, repo, branch, false);
    const filePattern  = /(?:^|\/)0*\d+[-_][a-z0-9-_]+\.[a-z]+$/i;
    const folderPat    = /(?:^|\/)0*\d+[-_][a-z0-9-_]+\/[^/]+\.[a-z]+$/i;
    const codeFiles    = tree.filter(f =>
      !f.path.endsWith('.md') && !f.path.includes('README') &&
      (filePattern.test(f.path) || folderPat.test(f.path))
    );

    console.log(`[WEBHOOK] Full sync: ${codeFiles.length} files in ${owner}/${repo}`);

    for (const file of codeFiles) {
      const parsed = parseSlug(file.path); // full path — folder fallback works
      if (!parsed) { results.skipped.push({ path: file.path, reason: 'Could not parse slug' }); continue; }

      try {
        const dateSolved = await getFileCommitDate(octokit, owner, repo, file.path, branch);
        const result = await mergeUpsert('github', {
          ...parsed,
          dateSolved,
          language:      detectLanguage(file.path),
          code_path:     file.path,
          repoName:      repo,
          solutionEntry: { language: detectLanguage(file.path), filePath: file.path, commitSha: null, committedAt: dateSolved },
        });
        results.synced.push(result);
      } catch (err) {
        results.errors.push({ path: file.path, error: err.message });
        console.error(`[ERROR] Full sync failed for ${file.path}: ${err.message}`);
      }
    }

    return res.json({
      success: true, total: codeFiles.length,
      synced: results.synced.length, skipped: results.skipped.length, errors: results.errors.length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/manual-problem — Manual problem entry ─────────────────────────
exports.manualProblemEntry = async (req, res) => {
  const { problem_id, title, difficulty, tags, time_taken, attempts, notes, dateSolved } = req.body;

  // Validate problem_id
  const problemId = normalizeProblemId(problem_id);
  if (!problemId) {
    return res.status(400).json({ success: false, error: 'Valid problem_id (integer > 0) is required' });
  }

  // title is required for new inserts; for updates it's optional (we keep existing)
  const existing = await Submission.findOne({ problemId });
  if (!existing && !title) {
    return res.status(400).json({ success: false, error: 'title is required for new problems' });
  }

  try {
    const meta   = getMetadata(problemId);
    const result = await mergeUpsert('manual', {
      problemId,
      title:      title || existing?.title,
      slug:       existing?.slug || '',
      difficulty: meta?.difficulty || difficulty || existing?.difficulty || 'Medium',
      tags:       meta?.tags       || tags       || existing?.tags       || [],
      time_taken: time_taken != null ? Number(time_taken) : null,
      attempts:   attempts   != null ? Number(attempts)   : null,
      notes:      notes || '',
      dateSolved: dateSolved ? new Date(dateSolved) : new Date(),
    });

    return res.status(result.action === 'inserted' ? 201 : 200).json({
      success: true,
      action:  result.action,
      message: result.action === 'inserted'
        ? `Problem #${problemId} added`
        : `Problem #${problemId} updated (merged)`,
      problemId,
    });
  } catch (err) {
    console.error(`[ERROR] Manual entry failed for #${problemId}: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/github-sync/problems ───────────────────────────────────────────
exports.mergeUpsert = mergeUpsert; // shared with debugController
exports.getProblems = async (req, res) => {
  try {
    const { difficulty, tag, language, source, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (tag)        filter.tags = tag;
    if (language)   filter.language = language;
    if (source)     filter.sources = source; // filter by source in array

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Submission.countDocuments(filter);
    const data  = await Submission.find(filter)
      .sort({ dateSolved: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-solutions');

    res.json({ success: true, total, page: parseInt(page), data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/github-sync/revision ───────────────────────────────────────────
exports.getRevision = async (req, res) => {
  try {
    const now = new Date();
    const [due, upcoming] = await Promise.all([
      Submission.find({ nextReviewAt: { $lte: now } }).sort({ nextReviewAt: 1 }),
      Submission.find({ nextReviewAt: { $gt:  now } }).sort({ nextReviewAt: 1 }).limit(10),
    ]);
    res.json({ success: true, dueNow: { count: due.length, data: due }, upcoming: { count: upcoming.length, data: upcoming } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/github-sync/streaks ────────────────────────────────────────────
exports.getStreaks = async (req, res) => {
  try {
    const submissions = await Submission.find({}, 'dateSolved').sort({ dateSolved: 1 });
    res.json({ success: true, ...computeStreaks(submissions) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
