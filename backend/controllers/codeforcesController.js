/**
 * Codeforces Controller — routes handler for CF sync & info
 * Wires codeforcesService.js to Express routes.
 */

const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const {
  syncCodeforcesProblems,
  fetchUserInfo,
} = require('../services/codeforcesService');
const { upsertSolvedProblem } = require('../services/problemUpsertService');

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

  const handle = req.body.handle || process.env.CF_HANDLE;
  if (!handle) {
    return res.status(400).json({
      success: false,
      error: 'Codeforces handle is required. Pass { "handle": "..." } in body or set CF_HANDLE env var.',
    });
  }

  syncLock = true;
  const startTime = Date.now();

  try {
    // 1. Fetch & transform from CF API
    const syncResult = await syncCodeforcesProblems(handle);
    if (!syncResult.success) {
      return res.status(502).json({ success: false, error: syncResult.error });
    }

    // 2. Upsert every solved problem by uniqueId (idempotent; no duplicates ever)
    // Rules enforced in upsertSolvedProblem:
    // - never overwrite solvedDate if already exists
    // - only update if incoming lastSubmittedAt is newer
    // - respect isDeleted intent lock
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedDeleted = 0;
    let skippedOlder = 0;
    const errors = [];

    for (const p of (syncResult.problems || [])) {
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
          solvedDate: p.solvedDate, // MUST exist for solved CF problems
        });
        if (r.action === 'inserted') insertedCount++;
        else if (r.action === 'updated') updatedCount++;
        else if (r.action === 'skipped_deleted') skippedDeleted++;
        else if (r.action === 'skipped_older') skippedOlder++;
      } catch (e) {
        errors.push(e.message);
      }
    }

    const totalCF = await Problem.countDocuments({ platform: 'CF', isDeleted: { $ne: true } });

    const endTime = Date.now();
    console.log(`[CF SYNC STATS] handle=${syncResult.handle} | uniqueAC=${syncResult.uniqueAccepted} | inserted=${insertedCount} updated=${updatedCount} skippedOlder=${skippedOlder} skippedDeleted=${skippedDeleted} | time=${endTime - startTime}ms`);
    lastSyncTime = Date.now();

    res.json({
      success: true,
      handle: syncResult.handle,
      rating: syncResult.rating,
      maxRating: syncResult.maxRating,
      totalFetched: syncResult.totalFetched,
      uniqueAccepted: syncResult.uniqueAccepted,
      inserted: insertedCount,
      updated: updatedCount,
      skippedOlder,
      skippedDeleted,
      totalCFInDB: totalCF,
      errors,
    });
  } catch (err) {
    console.error('[CF SYNC] Controller error:', err.message);
    // SAFE FALLBACK: Return empty result on error
    res.status(500).json({ 
      success: false, 
      error: err.message,
      handle: null,
      rating: null,
      maxRating: null,
      totalFetched: 0,
      uniqueAccepted: 0,
      inserted: 0,
      updated: 0,
      skippedOlder: 0,
      skippedDeleted: 0,
      totalCFInDB: 0,
      errors: [err.message]
    });
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
    // SAFE FALLBACK: Return nulls on error (UI handles nulls gracefully)
    res.status(502).json({ 
      success: false, 
      error: err.message,
      data: {
        handle: null,
        rating: null,
        maxRating: null,
        rank: null,
        maxRank: null,
        contribution: null,
        avatar: null
      }
    });
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
      const ratingValue = p.rating || p.rawDifficulty;
      const ratingBucket = ratingValue ? Math.floor(Number(ratingValue) / 100) * 100 : 'unrated';
      byRating[ratingBucket] = (byRating[ratingBucket] || 0) + 1;

      (p.topics || []).forEach(t => {
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
    // SAFE FALLBACK: Return empty stats on error
    res.status(500).json({ 
      success: false, 
      error: err.message,
      data: {
        total: 0,
        byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
        byRating: {},
        byTag: {}
      }
    });
  }
};
