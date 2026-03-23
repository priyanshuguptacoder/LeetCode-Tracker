const Problem = require('../models/Problem');
const { computeStats } = require('../utils/statsEngine');

// GET /api/analytics/streak — always computed from problem dates, never from stored fields
exports.getStreak = async (req, res) => {
  try {
    const problems = await Problem.find(
      { solved: true, isDeleted: { $ne: true }, solvedDate: { $ne: null } },
      { solvedDate: 1 }
    ).lean();

    const stats = computeStats(problems);

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
