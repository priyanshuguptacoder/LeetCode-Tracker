const { Octokit } = require('@octokit/rest');
const mongoose    = require('mongoose');
const Submission  = require('../models/Submission');
const Problem     = require('../models/Problem');

// ─── Shared sync state — written by webhook, read by health endpoints ─────────
const syncState = {
  last_sync:    null,
  last_event:   null,
  webhook_hits: 0,
};
exports.syncState = syncState;

// ─── Timing helper ────────────────────────────────────────────────────────────
async function timed(label, fn) {
  const start  = Date.now();
  const result = await fn();
  const ms     = Date.now() - start;
  console.log(`[PERF] ${label}: ${ms}ms`);
  return { result, ms };
}

// ─── GET /api/health ──────────────────────────────────────────────────────────
// Unified health: DB + GitHub reachability + env + last sync
exports.health = async (req, res) => {
  const dbOk      = mongoose.connection.readyState === 1;
  const tokenOk   = !!process.env.GITHUB_TOKEN;
  const secretOk  = !!process.env.GITHUB_WEBHOOK_SECRET;

  // Quick GitHub reachability ping (non-blocking — timeout 5s)
  let githubStatus = 'unknown';
  let githubMs     = null;
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });
    const t0 = Date.now();
    await octokit.meta.get();
    githubMs     = Date.now() - t0;
    githubStatus = 'reachable';
    console.log(`[INIT] GitHub API reachable (${githubMs}ms)`);
  } catch (err) {
    githubStatus = `unreachable: ${err.message}`;
    console.warn(`[ERROR] GitHub ping failed: ${err.message}`);
  }

  let totalProblems = 0;
  try { totalProblems = await Submission.countDocuments(); } catch (_) {}

  const overall = dbOk && githubStatus === 'reachable' ? 'ok' : 'degraded';

  res.json({
    status:         overall,
    db:             dbOk ? 'connected' : 'disconnected',
    github:         githubStatus,
    github_ping_ms: githubMs,
    github_token:   tokenOk  ? 'present' : 'missing',
    webhook_secret: secretOk ? 'present' : 'missing',
    last_sync:      syncState.last_sync,
    last_event:     syncState.last_event,
    webhook_hits:   syncState.webhook_hits,
    total_problems: totalProblems,
    timestamp:      new Date().toISOString(),
  });
};

// ─── GET /api/health/github-sync (kept for backwards compat) ─────────────────
exports.healthCheck = exports.health;

// ─── GET /api/test/github ─────────────────────────────────────────────────────
exports.testGitHub = async (req, res) => {
  if (!process.env.GITHUB_TOKEN) {
    return res.status(400).json({ success: false, error: 'GITHUB_TOKEN not set' });
  }

  const owner   = req.query.owner || process.env.GITHUB_OWNER || 'priyanshuguptacoder';
  const repo    = req.query.repo  || process.env.GITHUB_REPO  || 'LeetCode-Questions';
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const out     = { success: false, owner, repo, timings: {} };

  // 1. Auth identity
  try {
    const { result: { data }, ms } = await timed('github.auth', () => octokit.users.getAuthenticated());
    out.authenticated_as = data.login;
    out.timings.auth_ms  = ms;
    console.log(`[INIT] GitHub authenticated as: ${data.login} (${ms}ms)`);
  } catch (err) {
    out.auth_error = err.message;
    console.error(`[ERROR] GitHub auth failed: ${err.message}`);
  }

  // 2. Repo info
  try {
    const { result: { data }, ms } = await timed('github.repo', () => octokit.repos.get({ owner, repo }));
    out.repo_info = {
      full_name:      data.full_name,
      description:    data.description,
      default_branch: data.default_branch,
      private:        data.private,
      stars:          data.stargazers_count,
      last_push:      data.pushed_at,
    };
    out.timings.repo_ms = ms;
    console.log(`[INIT] Repo accessible: ${data.full_name} (${ms}ms)`);
  } catch (err) {
    out.repo_error = err.message;
    console.error(`[ERROR] Repo fetch failed: ${err.message}`);
    return res.json({ ...out, success: false });
  }

  // 3. Root tree
  try {
    const branch = out.repo_info.default_branch || 'main';
    const { result: { data }, ms } = await timed('github.tree',
      () => octokit.git.getTree({ owner, repo, tree_sha: branch, recursive: '0' })
    );
    out.root_tree      = data.tree.map(f => ({ path: f.path, type: f.type }));
    out.tree_truncated = data.truncated;
    out.timings.tree_ms = ms;
    console.log(`[INIT] Tree fetched: ${data.tree.length} root entries (${ms}ms)`);
  } catch (err) {
    out.tree_error = err.message;
    console.error(`[ERROR] Tree fetch failed: ${err.message}`);
  }

  out.success = !out.repo_error;
  return res.json(out);
};

// ─── GET /api/debug/db-check ──────────────────────────────────────────────────
exports.dbCheck = async (req, res) => {
  try {
    const { result: counts, ms: countMs } = await timed('db.counts', async () => {
      const [totalSubmissions, totalProblems] = await Promise.all([
        Submission.countDocuments(),
        Problem.countDocuments(),
      ]);
      return { totalSubmissions, totalProblems };
    });

    // Duplicate problemId check
    const { result: duplicates } = await timed('db.duplicates', () =>
      Submission.aggregate([
        { $group: { _id: '$problemId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $sort:  { count: -1 } },
      ])
    );
    if (duplicates.length > 0) {
      console.warn(`[DB] ⚠️  Duplicate problemIds: ${duplicates.map(d => d._id).join(', ')}`);
    }

    // Missing required fields
    const { result: missing } = await timed('db.missingFields', async () => {
      const [noTitle, noDate, noSource, noSlug] = await Promise.all([
        Submission.find({ title: { $in: [null, ''] } }, 'problemId title').lean(),
        Submission.find({ dateSolved: null },            'problemId title').lean(),
        Submission.find({ sources: { $size: 0 } },      'problemId title').lean(),
        Submission.find({ slug:  { $in: [null, ''] } }, 'problemId title').lean(),
      ]);
      return { noTitle, noDate, noSource, noSlug };
    });

    // Invalid entries: difficulty not in enum
    const { result: invalidDiff } = await timed('db.invalidDiff', () =>
      Submission.find(
        { difficulty: { $nin: ['Easy', 'Medium', 'Hard'] } },
        'problemId title difficulty'
      ).lean()
    );

    // Last inserted problem
    const { result: lastInserted } = await timed('db.lastInserted', () =>
      Submission.findOne()
        .sort({ createdAt: -1 })
        .select('problemId title difficulty sources dateSolved first_solved_at last_updated_at createdAt')
        .lean()
    );

    // Source breakdown
    const { result: sourceCounts } = await timed('db.sources', async () => {
      const [githubOnly, manualOnly, both] = await Promise.all([
        Submission.countDocuments({ sources: { $eq: ['github'] } }),
        Submission.countDocuments({ sources: { $eq: ['manual'] } }),
        Submission.countDocuments({ sources: { $all: ['github', 'manual'] } }),
      ]);
      return { githubOnly, manualOnly, both };
    });

    const missingFields = [
      ...missing.noTitle.map(p  => ({ problemId: p.problemId, field: 'title' })),
      ...missing.noDate.map(p   => ({ problemId: p.problemId, field: 'dateSolved' })),
      ...missing.noSource.map(p => ({ problemId: p.problemId, field: 'sources' })),
      ...missing.noSlug.map(p   => ({ problemId: p.problemId, field: 'slug' })),
    ];

    console.log(`[DB] db-check complete — ${counts.totalSubmissions} submissions, ${duplicates.length} dupes, ${missingFields.length} missing fields`);

    res.json({
      success:             true,
      totalProblems:       counts.totalSubmissions,
      problemsCollection:  counts.totalProblems,
      duplicateProblemIds: duplicates.length > 0 ? duplicates : [],
      missingFields:       missingFields.length > 0 ? missingFields : [],
      invalidEntries:      invalidDiff.length  > 0 ? invalidDiff  : [],
      sources:             sourceCounts,
      lastInsertedProblem: lastInserted || null,
      query_ms:            countMs,
    });
  } catch (err) {
    console.error(`[ERROR] db-check failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/debug/problems (kept for backwards compat) ─────────────────────
exports.debugProblems = exports.dbCheck;

// ─── GET /api/debug/frontend-check ───────────────────────────────────────────
// What the frontend needs: total count + latest 5 problems
exports.frontendCheck = async (req, res) => {
  try {
    const { result: data, ms } = await timed('db.frontendCheck', async () => {
      const [total, latest, byDifficulty] = await Promise.all([
        Submission.countDocuments(),
        Submission.find()
          .sort({ last_updated_at: -1 })
          .limit(5)
          .select('problemId title difficulty tags sources dateSolved last_updated_at language slug')
          .lean(),
        Submission.aggregate([
          { $group: { _id: '$difficulty', count: { $sum: 1 } } },
          { $sort:  { _id: 1 } },
        ]),
      ]);
      return { total, latest, byDifficulty };
    });

    console.log(`[DB] frontend-check: ${data.total} total, ${data.latest.length} latest fetched (${ms}ms)`);

    res.json({
      success:      true,
      total:        data.total,
      latest5:      data.latest,
      byDifficulty: data.byDifficulty,
      fetch_ms:     ms,
      note:         'Frontend should display latest5 in Recently Solved section',
    });
  } catch (err) {
    console.error(`[ERROR] frontend-check failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/debug/manual-test ─────────────────────────────────────────────
// Full end-to-end: manual insert → GitHub sync → verify merge → cleanup
exports.manualTest = async (req, res) => {
  // Lazy-load to avoid circular dependency at module load time
  const { mergeUpsert } = require('./githubSyncController');

  const TEST_ID    = 99999;
  const TEST_TITLE = 'Debug Test Problem';
  const log        = [];
  const timings    = {};

  const cleanup = async () => {
    await Submission.deleteOne({ problemId: TEST_ID });
    await Problem.deleteOne({ id: TEST_ID });
  };

  const step = (msg) => { log.push(msg); console.log(msg); };

  try {
    await cleanup();
    step('[INIT] Cleaned up previous test data');

    // ── Step 1: Manual insert ─────────────────────────────────────────────
    const { result: manualResult, ms: ms1 } = await timed('manual.insert', () =>
      mergeUpsert('manual', {
        problemId:  TEST_ID,
        title:      TEST_TITLE,
        difficulty: 'Easy',
        tags:       ['Array'],
        time_taken: 12,
        attempts:   1,
        notes:      'Test note from manual entry',
        dateSolved: new Date(),
      })
    );
    timings.manual_insert_ms = ms1;

    if (manualResult.action !== 'inserted')
      throw new Error(`Expected insert, got: ${manualResult.action}`);
    step(`[DB] INSERT problem_id: ${TEST_ID} — "${TEST_TITLE}" (manual) [${ms1}ms]`);

    const afterManual = await Submission.findOne({ problemId: TEST_ID });
    if (!afterManual) throw new Error('Manual insert not found in DB');
    step(`[DB] Verified: sources=[${afterManual.sources}], time_taken=${afterManual.time_taken}`);

    // ── Step 2: GitHub sync same problem ──────────────────────────────────
    const { result: githubResult, ms: ms2 } = await timed('github.upsert', () =>
      mergeUpsert('github', {
        problemId:  TEST_ID,
        title:      TEST_TITLE,
        slug:       'debug-test-problem',
        difficulty: 'Easy',
        tags:       ['Array', 'Hash Table'],
        language:   'JavaScript',
        code_path:  '99999-debug-test-problem.js',
        repoName:   'LeetCode-Questions',
        dateSolved: new Date(),
        solutionEntry: {
          language:    'JavaScript',
          filePath:    '99999-debug-test-problem.js',
          commitSha:   'abc123test',
          committedAt: new Date(),
        },
      })
    );
    timings.github_upsert_ms = ms2;

    if (githubResult.action !== 'updated')
      throw new Error(`Expected update (merge), got: ${githubResult.action}`);
    step(`[DB] UPDATE problem_id: ${TEST_ID} — GitHub merged [${ms2}ms]`);

    // ── Step 3: Assertions ────────────────────────────────────────────────
    const afterMerge = await Submission.findOne({ problemId: TEST_ID });
    if (!afterMerge) throw new Error('Record missing after merge');

    const count = await Submission.countDocuments({ problemId: TEST_ID });
    if (count !== 1) throw new Error(`Duplicate detected — found ${count} records for #${TEST_ID}`);
    step(`[DB] No duplicate — exactly 1 record for #${TEST_ID} ✅`);

    if (!afterMerge.sources.includes('github') || !afterMerge.sources.includes('manual'))
      throw new Error(`Sources not merged: [${afterMerge.sources}]`);
    step(`[DB] Sources merged: [${afterMerge.sources}] ✅`);

    if (afterMerge.time_taken !== 12)
      throw new Error(`time_taken should be 12 (manual wins), got: ${afterMerge.time_taken}`);
    step(`[DB] time_taken preserved from manual: ${afterMerge.time_taken}min ✅`);

    if (!afterMerge.code_path)
      throw new Error('code_path from GitHub not stored');
    step(`[DB] code_path from GitHub: ${afterMerge.code_path} ✅`);

    if (!afterMerge.notes?.includes('Test note'))
      throw new Error('Notes not preserved');
    step(`[DB] Notes preserved ✅`);

    if (!afterMerge.solutions?.length)
      throw new Error('Solutions array empty');
    step(`[DB] Solutions tracked: ${afterMerge.solutions.length} ✅`);

    // Verify Problem collection also synced
    const problemDoc = await Problem.findOne({ id: TEST_ID });
    if (!problemDoc) throw new Error('Problem collection not synced');
    step(`[DB] Problem collection synced: "${problemDoc.title}" ✅`);

    await cleanup();
    step('[INIT] Test data cleaned up');

    return res.json({ success: true, passed: true, message: 'All checks passed', log, timings });

  } catch (err) {
    await cleanup().catch(() => {});
    step(`[ERROR] Test failed: ${err.message}`);
    return res.json({ success: false, passed: false, message: err.message, log, timings });
  }
};

// ─── POST /api/debug/run-all ──────────────────────────────────────────────────
// Final validation script — runs every check in sequence, returns full report
exports.runAll = async (req, res) => {
  const { mergeUpsert } = require('./githubSyncController');
  const report = { steps: [], passed: 0, failed: 0, timestamp: new Date().toISOString() };
  const log    = (status, name, detail) => {
    const entry = { status, name, detail };
    report.steps.push(entry);
    console.log(`[${status === 'pass' ? 'INIT' : 'ERROR'}] ${name}: ${JSON.stringify(detail)}`);
    if (status === 'pass') report.passed++; else report.failed++;
  };

  // 1. Env check
  log(
    process.env.GITHUB_TOKEN && process.env.GITHUB_WEBHOOK_SECRET ? 'pass' : 'fail',
    'Environment variables',
    {
      GITHUB_TOKEN:           !!process.env.GITHUB_TOKEN,
      GITHUB_WEBHOOK_SECRET:  !!process.env.GITHUB_WEBHOOK_SECRET,
      MONGO_URI:              !!process.env.MONGO_URI,
    }
  );

  // 2. DB connection
  log(
    mongoose.connection.readyState === 1 ? 'pass' : 'fail',
    'Database connection',
    { readyState: mongoose.connection.readyState }
  );

  // 3. GitHub API
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });
    const t0 = Date.now();
    const { data } = await octokit.meta.get();
    log('pass', 'GitHub API reachable', { ping_ms: Date.now() - t0, sha: data.installed_version || 'ok' });
  } catch (err) {
    log('fail', 'GitHub API reachable', { error: err.message });
  }

  // 4. DB counts
  try {
    const [subs, probs] = await Promise.all([
      Submission.countDocuments(),
      Problem.countDocuments(),
    ]);
    log('pass', 'DB counts', { submissions: subs, problems: probs });
  } catch (err) {
    log('fail', 'DB counts', { error: err.message });
  }

  // 5. Duplicate check
  try {
    const dupes = await Submission.aggregate([
      { $group: { _id: '$problemId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    log(
      dupes.length === 0 ? 'pass' : 'fail',
      'No duplicate problemIds',
      dupes.length === 0 ? { duplicates: 0 } : { duplicates: dupes.map(d => d._id) }
    );
  } catch (err) {
    log('fail', 'Duplicate check', { error: err.message });
  }

  // 6. Manual insert test
  const TEST_ID = 88888;
  const cleanup = async () => {
    await Submission.deleteOne({ problemId: TEST_ID });
    await Problem.deleteOne({ id: TEST_ID });
  };
  try {
    await cleanup();
    const r1 = await mergeUpsert('manual', {
      problemId: TEST_ID, title: 'Run-All Test', difficulty: 'Easy',
      tags: ['Test'], time_taken: 5, dateSolved: new Date(),
    });
    log(r1.action === 'inserted' ? 'pass' : 'fail', 'Manual insert', { action: r1.action, problemId: TEST_ID });
  } catch (err) {
    log('fail', 'Manual insert', { error: err.message });
  }

  // 7. GitHub upsert (merge) test
  try {
    const r2 = await mergeUpsert('github', {
      problemId: TEST_ID, title: 'Run-All Test', slug: 'run-all-test',
      difficulty: 'Easy', tags: ['Test'], language: 'Python',
      code_path: '88888-run-all-test.py', repoName: 'LeetCode-Questions',
      dateSolved: new Date(),
    });
    log(r2.action === 'updated' ? 'pass' : 'fail', 'GitHub merge (no duplicate)', { action: r2.action });
  } catch (err) {
    log('fail', 'GitHub merge', { error: err.message });
  }

  // 8. Verify single record after merge
  try {
    const count = await Submission.countDocuments({ problemId: TEST_ID });
    const doc   = await Submission.findOne({ problemId: TEST_ID });
    const hasBoth = doc?.sources?.includes('github') && doc?.sources?.includes('manual');
    log(
      count === 1 && hasBoth ? 'pass' : 'fail',
      'Merge integrity',
      { count, sources: doc?.sources }
    );
  } catch (err) {
    log('fail', 'Merge integrity', { error: err.message });
  }

  // 9. Frontend data fetch
  try {
    const { result: { total, latest }, ms } = await timed('frontend.fetch', async () => {
      const total  = await Submission.countDocuments();
      const latest = await Submission.find().sort({ last_updated_at: -1 }).limit(5).lean();
      return { total, latest };
    });
    log('pass', 'Frontend data fetch', { total, latest_count: latest.length, fetch_ms: ms });
  } catch (err) {
    log('fail', 'Frontend data fetch', { error: err.message });
  }

  await cleanup().catch(() => {});

  const allPassed = report.failed === 0;
  console.log(`[INIT] run-all complete — ${report.passed} passed, ${report.failed} failed`);

  res.json({
    success:    allPassed,
    summary:    `${report.passed} passed, ${report.failed} failed`,
    all_passed: allPassed,
    report,
  });
};
