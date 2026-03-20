const { getDailyActivityMap, calculateStreak } = require('../services/analyticsService');

// GET /api/analytics/streak
exports.getStreak = async (req, res) => {
  try {
    const activity = await getDailyActivityMap();
    const currentStreak = calculateStreak(activity);
    res.json({ success: true, currentStreak });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
