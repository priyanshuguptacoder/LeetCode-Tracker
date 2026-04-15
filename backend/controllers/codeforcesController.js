/**
 * Codeforces Controller — routes handler for CF sync & info
 * Wires codeforcesService.js to Express routes.
 */

const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const {
  syncCodeforcesProblems,
  fetchUserInfo,
  filterNewProblems,
} = require('../services/codeforcesService');

let syncLock = false;
let lastSyncTime = 0;
const COOLDOWN_MS = 60 * 1000;

exports.getSyncLock = () => syncLock;

// ─── POST /api/codeforces/sync ────────────────────────────────────────────────
// Fetches all accepted CF submissions, deduplicates, transforms, and upserts.
// Idempotent — safe to call multiple times; only inserts genuinely new problems.
exports.syncCodeforces = async (req, res) => {
  if (syncLock) {
    return res.status(429).json({ success: false, error: 'Codeforces sync is currently running across the system. Please try again soon.' });
  }

  const now = Date.now();
  if (now - lastSyncTime < COOLDOWN_MS) {
    return res.status(429).json({ success: false, error: `Codeforces sync is on cooldown. Try again in ${Math.ceil((COOLDOWN_MS - (now - lastSyncTime))/1000)}s` });
  }

  syncLock = true;
  const startTime = Date.now();
  
  const handle = req.body.handle || process.env.CF_HANDLE;
  if (!handle) {
    return res.status(400).json({
      success: false,
      error: 'Codeforces handle is required. Pass { "handle": "..." } in body or set CF_HANDLE env var.',
    });
  }

  try {
    // 1. Fetch & transform from CF API
    const syncResult = await syncCodeforcesProblems(handle);
    if (!syncResult.success) {
      return res.status(502).json({ success: false, error: syncResult.error });
    }

    // 2. Find existing CF problems in DB to avoid duplicates
    const existingProblems = await Problem.find(
      { platform: 'CF', isDeleted: { $ne: true } },
      { id: 1 }
    ).lean();

    const newProblems = filterNewProblems(syncResult.problems, existingProblems);

    // 3. Also check soft-deleted problems — respect user intent lock
    const deletedProblems = await Problem.find(
      { platform: 'CF', isDeleted: true },
      { id: 1 }
    ).lean();
    const deletedIds = new Set(deletedProblems.map(p => p.id));
    const insertable = newProblems.filter(p => !deletedIds.has(p.id));

    // 4. Bulk insert new problems
    let insertedCount = 0;
    const errors = [];

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

      try {
        const [bulkProblem, bulkSubmission] = await Promise.all([
          Problem.bulkWrite(problemOps, { ordered: false }),
          Submission.bulkWrite(submissionOps, { ordered: false })
        ]);
        insertedCount = bulkProblem.upsertedCount || 0;
        console.log(`[CF SYNC] Inserted ${insertedCount} new problems and ${bulkSubmission.upsertedCount || 0} submissions`);
      } catch (bulkErr) {
        // Partial success — some may have been inserted
        console.error('[CF SYNC] Bulk write error:', bulkErr.message);
        errors.push(bulkErr.message);
        insertedCount = bulkErr.result?.nUpserted || 0;
      }
    }

    const skippedIntentLock = newProblems.length - insertable.length;
    const totalCF = await Problem.countDocuments({ platform: 'CF', isDeleted: { $ne: true } });

    const endTime = Date.now();
    console.log(`[CF SYNC STATS] handle=${syncResult.handle} | uniqueAC=${syncResult.uniqueAccepted} | inserted=${insertedCount} | time=${endTime - startTime}ms`);
    lastSyncTime = Date.now();

    res.json({
      success: true,
      handle: syncResult.handle,
      rating: syncResult.rating,
      maxRating: syncResult.maxRating,
      totalFetched: syncResult.totalFetched,
      uniqueAccepted: syncResult.uniqueAccepted,
      newProblems: insertable.length,
      inserted: insertedCount,
      skippedExisting: syncResult.uniqueAccepted - newProblems.length,
      skippedDeleted: skippedIntentLock,
      totalCFInDB: totalCF,
      errors,
    });
  } catch (err) {
    console.error('[CF SYNC] Controller error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    syncLock = false;
  }
};

// ─── GET /api/codeforces/info ─────────────────────────────────────────────────
// Returns CF user info (rating, rank, etc.)
exports.getCodeforcesInfo = async (req, res) => {
  const handle = req.query.handle || process.env.CF_HANDLE;
  if (!handle) {
    return res.status(400).json({
      success: false,
      error: 'Codeforces handle is required. Pass ?handle=... or set CF_HANDLE env var.',
    });
  }

  try {
    const userInfo = await fetchUserInfo(handle);
    res.json({
      success: true,
      data: {
        handle: userInfo.handle,
        rating: userInfo.rating,
        maxRating: userInfo.maxRating,
        rank: userInfo.rank,
        maxRank: userInfo.maxRank,
        contribution: userInfo.contribution,
        avatar: userInfo.avatar,
      },
    });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
};

// ─── GET /api/codeforces/stats ────────────────────────────────────────────────
// Returns stats for CF problems in DB
exports.getCodeforcesStats = async (req, res) => {
  try {
    const problems = await Problem.find({
      platform: 'CF',
      solved: true,
      isDeleted: { $ne: true },
    }).lean();

    const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
    const byRating = {};
    const byTag = {};

    const safeProblems = Array.isArray(problems) ? problems : [];

    safeProblems.forEach(p => {
      byDifficulty[p.difficulty] = (byDifficulty[p.difficulty] || 0) + 1;

      // Group by raw rating buckets (800, 900, ..., 3500)
      const ratingBucket = p.rawDifficulty ? Math.floor(p.rawDifficulty / 100) * 100 : 'unrated';
      byRating[ratingBucket] = (byRating[ratingBucket] || 0) + 1;

      (p.tags || []).forEach(t => {
        byTag[t] = (byTag[t] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        total: safeProblems.length,
        byDifficulty,
        byRating,
        byTag,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
