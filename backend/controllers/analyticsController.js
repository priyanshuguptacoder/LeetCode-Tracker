// updated: streak reads from Settings document (isManualOverride support)
const Settings = require('../models/Settings');

// GET /api/analytics/streak — returns trusted streak values from Settings document
exports.getStreak = async (req, res) => {
  try {
    let s = await Settings.findOne({ key: 'global' });
    if (!s) s = await Settings.create({ key: 'global', currentStreak: 0, activeDays: 0, maxStreak: 0, isManualOverride: false });
    res.json({
      success: true,
      currentStreak:    s.currentStreak,
      activeDays:       s.activeDays,
      maxStreak:        s.maxStreak,
      isManualOverride: s.isManualOverride,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
