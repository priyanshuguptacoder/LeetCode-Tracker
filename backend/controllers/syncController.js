const Settings = require('../models/Settings');
const { fetchLeetCodeContestData, syncRecentSubmissions } = require('./leetcodeController');
const { syncCodeforcesProblems, fetchUserContestData, fetchUserInfo } = require('../services/codeforcesService');
const { upsertSolvedProblem } = require('../services/problemUpsertService');

async function syncLeetCodeProblems() {
  // LeetCode sync already upserts into Problem collection via leetcodeController's syncToProblemCollection.
  return await syncRecentSubmissions();
}

async function syncCodeforcesProblemsAndUpsert(cfHandle) {
  if (!cfHandle) throw new Error('CF_HANDLE not set');
  const syncResult = await syncCodeforcesProblems(cfHandle);
  if (!syncResult?.success) return syncResult;

  const problems = Array.isArray(syncResult.problems) ? syncResult.problems : [];
  const counters = { inserted: 0, updated: 0, skippedOlder: 0, skippedDeleted: 0, errors: 0 };

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
      if (r.action === 'inserted') counters.inserted++;
      else if (r.action === 'updated') counters.updated++;
      else if (r.action === 'skipped_older') counters.skippedOlder++;
      else if (r.action === 'skipped_deleted') counters.skippedDeleted++;
    } catch (_) {
      counters.errors++;
    }
  }

  return {
    ...syncResult,
    upsert: counters,
  };
}

async function syncLeetCodeContest() {
  const lcd = await fetchLeetCodeContestData();
  await Settings.findOneAndUpdate(
    { key: 'global' },
    {
      $set: {
        lcRating: lcd?.rating ?? null,
        lcContestCount: lcd?.contestCount ?? null,
        lcGlobalRank: lcd?.globalRank ?? null,
        lcContestUpdatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return lcd;
}

async function syncCodeforcesContest(cfHandle) {
  if (!cfHandle) throw new Error('CF_HANDLE not set');
  const [contestData, userInfo] = await Promise.allSettled([
    fetchUserContestData(cfHandle),
    fetchUserInfo(cfHandle),
  ]);

  const cd = contestData.status === 'fulfilled' ? contestData.value : {};
  const ui = userInfo.status === 'fulfilled' ? userInfo.value : {};

  const payload = {
    rating: ui.rating ?? cd.currentRating ?? null,       // user.info rating is most reliable
    maxRating: ui.maxRating ?? cd.maxRating ?? null,
    rank: ui.rank ?? null,
    maxRank: ui.maxRank ?? null,
    contestCount: cd.contestCount ?? 0,
  };

  await Settings.findOneAndUpdate(
    { key: 'global' },
    {
      $set: {
        cfRating: payload.rating,
        cfMaxRating: payload.maxRating,
        cfRank: payload.rank,
        cfMaxRank: payload.maxRank,
        cfContestCount: payload.contestCount,
        cfContestUpdatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return payload;
}

// POST /api/sync/all
exports.syncAll = async (req, res) => {
  const cfHandle = req.body?.cfHandle || process.env.CF_HANDLE;

  const settled = await Promise.allSettled([
    syncLeetCodeProblems(),
    syncCodeforcesProblemsAndUpsert(cfHandle),
    syncLeetCodeContest(),
    syncCodeforcesContest(cfHandle),
  ]);

  const [lcProblems, cfProblems, lcContest, cfContest] = settled;

  const result = {
    lc: {
      problems: lcProblems.status === 'fulfilled' ? lcProblems.value : { error: lcProblems.reason?.message || String(lcProblems.reason) },
      contest: lcContest.status === 'fulfilled' ? lcContest.value : { error: lcContest.reason?.message || String(lcContest.reason) },
    },
    cf: {
      problems: cfProblems.status === 'fulfilled' ? cfProblems.value : { error: cfProblems.reason?.message || String(cfProblems.reason) },
      contest: cfContest.status === 'fulfilled' ? cfContest.value : { error: cfContest.reason?.message || String(cfContest.reason) },
    },
  };

  const anySuccess =
    (lcProblems.status === 'fulfilled') ||
    (cfProblems.status === 'fulfilled' && result.cf.problems?.success !== false) ||
    (lcContest.status === 'fulfilled') ||
    (cfContest.status === 'fulfilled');

  return res.status(anySuccess ? 200 : 502).json({
    success: anySuccess,
    data: result,
  });
};

