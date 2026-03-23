const Problem = require('../models/Problem');
const Settings = require('../models/Settings');
const { computeStats } = require('../utils/statsEngine');

// GET /api/analytics/streak — always computed from problem dates, never from stored fields
exports.getStreak = async (req, res) => {
  try {
    const [problems, settings] = await Promise.all([
      Problem.find(
        { solved: true, isDeleted: { $ne: true }, solvedDate: { $ne: null } },
        { solvedDate: 1 }
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
