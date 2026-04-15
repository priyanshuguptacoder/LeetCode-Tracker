const Problem = require('../models/Problem');
const Settings = require('../models/Settings');
const { computeStats } = require('../utils/statsEngine');

// GET /api/analytics/streak — always computed from problem dates, never from stored fields
// Includes BOTH LC and CF platforms
exports.getStreak = async (req, res) => {
  try {
    const [problems, settings] = await Promise.all([
      Problem.find(
        { solved: true, isDeleted: { $ne: true }, solvedDate: { $ne: null } },
        { solvedDate: 1, platform: 1 }
      ).lean(),
      Settings.findOne({ key: 'global' }, { submissionCalendarDates: 1 }).lean(),
    ]);

    const calendarDates = settings?.submissionCalendarDates?.length > 0
      ? settings.submissionCalendarDates
      : null;

    const stats = computeStats(problems, calendarDates);

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
      solvedDate: { $ne: null },
      ...platformFilter
    })
      .sort({ solvedDate: -1 })
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
    // Base condition: solvedDate exists (unified with all analytics)
    const stats = await Problem.aggregate([
      { $match: { solved: true, isDeleted: { $ne: true }, solvedDate: { $ne: null } } },
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

// GET /api/analytics/contest — returns contest stats from BOTH platforms
// SAFETY: Returns null for missing values, never crashes UI
exports.getContestStats = async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne({ key: 'global' }).lean();

    // SAFE EXTRACTION: All values default to null if missing
    const contestStats = {
      leetcode: {
        rating: settings?.lcRating ?? null,
        contestCount: settings?.lcContestCount ?? null,
        globalRank: settings?.lcGlobalRank ?? null,
        updatedAt: settings?.lcContestUpdatedAt ?? null,
      },
      codeforces: {
        rating: settings?.cfRating ?? null,
        maxRating: settings?.cfMaxRating ?? null,
        rank: settings?.cfRank ?? null,
        maxRank: settings?.cfMaxRank ?? null,
        contestCount: settings?.cfContestCount ?? null,
        updatedAt: settings?.cfContestUpdatedAt ?? null,
      },
    };

    res.json({
      success: true,
      data: contestStats,
    });
  } catch (err) {
    // SAFE FALLBACK: Return nulls on error
    res.status(500).json({
      success: false,
      error: err.message,
      data: {
        leetcode: { rating: null, contestCount: null, globalRank: null, updatedAt: null },
        codeforces: { rating: null, maxRating: null, rank: null, maxRank: null, contestCount: null, updatedAt: null },
      },
    });
  }
};
