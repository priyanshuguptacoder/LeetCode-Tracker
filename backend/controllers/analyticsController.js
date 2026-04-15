const Problem = require('../models/Problem');
const Settings = require('../models/Settings');
const { computeStats } = require('../utils/statsEngine');

// GET /api/analytics/streak — always computed from problem dates, never from stored fields
// Includes BOTH LC and CF platforms
exports.getStreak = async (req, res) => {
  try {
    const debugCount = await Problem.countDocuments({ solved: true, isDeleted: { $ne: true } });
    console.log('[DEBUG] solved count:', debugCount);

    const [problems, settings] = await Promise.all([
      Problem.find(
        {
          solved: true,
          isDeleted: { $ne: true },
          $or: [
            { solvedDate: { $ne: null } },
            { lastSubmittedAt: { $ne: null } },
          ],
        },
        { solvedDate: 1, lastSubmittedAt: 1, platform: 1 }
      ).lean(),
      Settings.findOne({ key: 'global' }, { submissionCalendarDates: 1 }).lean(),
    ]);

    // Normalize: use lastSubmittedAt as fallback if solvedDate is null
    const normalized = problems.map(p => ({
      ...p,
      solvedDate: p.solvedDate || p.lastSubmittedAt,
    }));

    const calendarDates = settings?.submissionCalendarDates?.length > 0
      ? settings.submissionCalendarDates
      : null;

    const stats = computeStats(normalized, calendarDates);

    // Debug log — visible in Render logs to diagnose streak issues
    const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    console.log(
      '[STREAK] todayKey:', stats.todayKey,
      '| currentStreak:', stats.currentStreak,
      '| calendarDates last 3:', calendarDates ? calendarDates.slice(-3) : 'none (using solvedDates)',
      '| daySet has yesterday:', stats.days.includes(yesterdayUTC)
    );

    if (!stats.isValid) {
      return res.status(500).json({ success: false, error: 'Stats invariant violation', errors: stats.errors });
    }

    res.json({
      success:       true,
      data: {
        currentStreak: stats.currentStreak,
        maxStreak:     stats.maxStreak,
        activeDays:    stats.activeDays,
        daysTracked:   stats.daysTracked,
        consistency:   stats.consistency,
        startDate:     stats.startDate,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/analytics/recently-solved — returns recently solved from BOTH platforms
exports.getRecentlySolved = async (req, res) => {
  try {
    const { limit = 20, platform = 'ALL' } = req.query;
    const platformFilter = platform !== 'ALL' ? { platform: platform.toUpperCase() } : {};
    
    const problems = await Problem.find({
      solved: true,
      isDeleted: { $ne: true },
      $or: [
        { solvedDate: { $ne: null } },
        { lastSubmittedAt: { $ne: null } },
      ],
      ...platformFilter
    })
      .sort({ lastSubmittedAt: -1, solvedDate: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    // Return empty array (never undefined) for safe frontend rendering
    res.json({
      success: true,
      count: problems?.length || 0,
      platform: platform.toUpperCase(),
      data: problems || []
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message,
      data: [],
      count: 0
    });
  }
};

// GET /api/analytics/by-platform — returns stats grouped by platform
exports.getByPlatform = async (req, res) => {
  try {
    const stats = await Problem.aggregate([
      {
        $match: {
          solved: true,
          isDeleted: { $ne: true },
          $or: [
            { solvedDate: { $ne: null } },
            { lastSubmittedAt: { $ne: null } },
          ],
        },
      },
      {
        $group: {
          _id: '$platform',
          totalSolved: { $sum: 1 },
          byDifficulty: {
            $push: '$difficulty'
          },
          avgRevisionCount: { $avg: '$revisionCount' },
        }
      }
    ]);

    // Format difficulty breakdown
    const formatted = stats.map(s => {
      const diffCounts = { Easy: 0, Medium: 0, Hard: 0, Unknown: 0 };
      s.byDifficulty.forEach(d => {
        diffCounts[d] = (diffCounts[d] || 0) + 1;
      });
      return {
        platform: s._id || 'LC',
        totalSolved: s.totalSolved,
        byDifficulty: diffCounts,
        avgRevisionCount: Math.round(s.avgRevisionCount * 100) / 100
      };
    });

    res.json({
      success: true,
      data: formatted || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, data: [] });
  }
};

// GET /api/analytics/targeted — returns targeted problems from BOTH platforms
exports.getTargeted = async (req, res) => {
  try {
    const { platform = 'ALL' } = req.query;
    const platformFilter = platform !== 'ALL' ? { platform: platform.toUpperCase() } : {};

    const problems = await Problem.find({
      targeted: true,
      isDeleted: { $ne: true },
      ...platformFilter
    })
      .sort({ targetedAt: -1 })
      .lean();

    res.json({
      success: true,
      count: problems?.length || 0,
      data: problems || []
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      data: []
    });
  }
};

// GET /api/analytics/streak-by-platform — LC streak, CF streak, combined streak
// GET /api/analytics/streak-by-platform — LC streak, CF streak, combined streak
// Uses lastSubmittedAt as the authoritative date field for per-platform calculation.
exports.getStreakByPlatform = async (req, res) => {
  try {
    const [allProblems, settings] = await Promise.all([
      Problem.find(
        {
          solved: true,
          isDeleted: { $ne: true },
          $or: [{ lastSubmittedAt: { $ne: null } }, { solvedDate: { $ne: null } }],
        },
        { lastSubmittedAt: 1, solvedDate: 1, platform: 1 }
      ).lean(),
      Settings.findOne({ key: 'global' }, { submissionCalendarDates: 1 }).lean(),
    ]);

    // Build a UTC date-set from lastSubmittedAt (most recent submission per problem)
    const buildDateSet = (list) => {
      const set = new Set();
      const todayKey = new Date().toISOString().split('T')[0];
      for (const p of list) {
        const raw = p.lastSubmittedAt || p.solvedDate;
        if (!raw) continue;
        const key = new Date(raw).toISOString().split('T')[0];
        if (key <= todayKey) set.add(key);
      }
      return set;
    };

    // Calculate current streak, max streak, active days from a date set
    const calcStreak = (dateSet) => {
      if (dateSet.size === 0) return { currentStreak: 0, maxStreak: 0, activeDays: 0 };

      const sorted = [...dateSet].sort();
      const activeDays = sorted.length;

      // Max streak — full scan
      let maxStreak = 1, temp = 1;
      for (let i = 1; i < sorted.length; i++) {
        const diff = Math.round(
          (new Date(sorted[i] + 'T00:00:00Z') - new Date(sorted[i - 1] + 'T00:00:00Z')) / 86400000
        );
        if (diff === 1) { temp++; maxStreak = Math.max(maxStreak, temp); }
        else temp = 1;
      }
      maxStreak = Math.max(maxStreak, temp);

      // Current streak — walk back from today (streak alive if solved today OR yesterday)
      const todayKey     = new Date().toISOString().split('T')[0];
      const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const startKey = dateSet.has(todayKey) ? todayKey : (dateSet.has(yesterdayKey) ? yesterdayKey : null);
      let currentStreak = 0;
      if (startKey) {
        let cursor = new Date(startKey + 'T00:00:00Z');
        while (dateSet.has(cursor.toISOString().split('T')[0])) {
          currentStreak++;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        }
      }

      return { currentStreak, maxStreak, activeDays };
    };

    const lcProblems = allProblems.filter(p => p.platform === 'LC');
    const cfProblems = allProblems.filter(p => p.platform === 'CF');

    const lcStats       = calcStreak(buildDateSet(lcProblems));
    const cfStats       = calcStreak(buildDateSet(cfProblems));

    // Combined: prefer LeetCode submission calendar (most accurate for LC days)
    const calendarDates = settings?.submissionCalendarDates?.length > 0
      ? settings.submissionCalendarDates
      : null;

    let combinedStats;
    if (calendarDates) {
      // Merge calendar dates with CF submission dates for true combined streak
      const cfDateSet = buildDateSet(cfProblems);
      const mergedSet = new Set([...calendarDates, ...cfDateSet]);
      combinedStats = calcStreak(mergedSet);
    } else {
      combinedStats = calcStreak(buildDateSet(allProblems));
    }

    res.json({
      success: true,
      data: {
        combined: combinedStats,
        lc:       lcStats,
        cf:       cfStats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// SAFETY: Returns null for missing values, never crashes UI
exports.getContestStats = async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne({ key: 'global' }).lean();

    res.json({
      success: true,
      data: {
        lcRating: settings?.lcRating ?? null,
        lcContestCount: settings?.lcContestCount ?? null,
        lcGlobalRank: settings?.lcGlobalRank ?? null,
        cfRating: settings?.cfRating ?? null,
        cfMaxRating: settings?.cfMaxRating ?? null,
        cfRank: settings?.cfRank ?? null,
        cfContestCount: settings?.cfContestCount ?? null,
      },
    });
  } catch (err) {
    // SAFE FALLBACK: Return nulls on error
    res.status(500).json({
      success: false,
      error: err.message,
      data: {
        lcRating: null,
        lcContestCount: null,
        lcGlobalRank: null,
        cfRating: null,
        cfMaxRating: null,
        cfRank: null,
        cfContestCount: null,
      },
    });
  }
};
