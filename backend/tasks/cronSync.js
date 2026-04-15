const { syncCodeforcesProblems } = require('../services/codeforcesService');
const { getSyncLock } = require('../controllers/codeforcesController');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');

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
    const { insertable } = await syncCodeforcesProblems(handle);
    
    if (insertable.length > 0) {
      const problemOps = insertable.map(p => ({
        updateOne: {
          filter: { id: p.id },
          update: { $setOnInsert: p },
          upsert: true,
        },
      }));

      const submissionOps = insertable.map(p => ({
        updateOne: {
          filter: { problemId: p.id },
          update: {
            $setOnInsert: {
              problemId: p.id,
              platform: 'CF',
              slug: p.id.toLowerCase(),
              title: p.title,
              difficulty: p.difficulty,
              tags: p.tags,
              link: p.platformLink,
              dateSolved: p.solvedDate,
              first_solved_at: p.solvedDate,
              last_updated_at: p.solvedDate,
              sources: ['api'],
              isDeleted: false
            }
          },
          upsert: true
        }
      }));

      const [pRes, sRes] = await Promise.all([
        Problem.bulkWrite(problemOps, { ordered: false }),
        Submission.bulkWrite(submissionOps, { ordered: false })
      ]);

      console.log(`[CRON] Sync success: ${pRes.upsertedCount} new problems, ${sRes.upsertedCount} new submissions`);
    } else {
      console.log('[CRON] Sync complete: No new submissions found');
    }
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
