const { syncCodeforcesProblems } = require('../services/codeforcesService');
const { getSyncLock } = require('../controllers/codeforcesController');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const { upsertSolvedProblem } = require('../services/problemUpsertService');

/**
 * Background Task: Sync Codeforces Submissions
 * Runs every 12 hours to keep the database fresh without manual intervention.
 */
async function runAutoSync() {
  if (getSyncLock && getSyncLock()) {
    console.log('[CRON] Sync skipped — manual UI sync is currently in progress');
    return;
  }

  const handle = process.env.CF_HANDLE;
  if (!handle) {
    console.warn('[CRON] CF_HANDLE not set — auto-sync skipped');
    return;
  }

  console.log(`[CRON] Starting 12-hour Codeforces sync for handle: ${handle}`);
  const startTime = Date.now();

  try {
    const syncResult = await syncCodeforcesProblems(handle);
    const problems = Array.isArray(syncResult?.problems) ? syncResult.problems : [];

    let inserted = 0, updated = 0, skippedOlder = 0, skippedDeleted = 0, errors = 0;

    for (const p of problems) {
      try {
        const r = await upsertSolvedProblem({
          uniqueId: p.uniqueId,
          platform: 'CF',
          title: p.title,
          difficulty: p.difficulty,
          topics: p.tags || [],
          platformLink: p.platformLink,
          contestId: p.contestId,
          index: p.index,
          rating: p.rating,
          lastSubmittedAt: p.lastSubmittedAt,
          solvedDate: p.solvedDate,
        });
        if (r.action === 'inserted') inserted++;
        else if (r.action === 'updated') updated++;
        else if (r.action === 'skipped_older') skippedOlder++;
        else if (r.action === 'skipped_deleted') skippedDeleted++;
      } catch (_) {
        errors++;
      }
    }

    console.log(`[CRON] Sync finished: inserted=${inserted} updated=${updated} skippedOlder=${skippedOlder} skippedDeleted=${skippedDeleted} errors=${errors}`);
  } catch (err) {
    console.error(`[CRON] Sync failed: ${err.message}`);
  } finally {
    console.log(`[CRON] Task finished in ${Date.now() - startTime}ms`);
  }
}

// Start the 12-hour loop
function initCron() {
  // Run once on startup
  runAutoSync();
  
  // Every 12 hours
  const INTERVAL = 12 * 60 * 60 * 1000;
  setInterval(runAutoSync, INTERVAL);
}

module.exports = { initCron, runAutoSync };
