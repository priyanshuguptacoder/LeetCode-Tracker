// updated: added isManualOverride field for manual streak lock support
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    lastSyncAt: { type: Date, default: Date.now },

    // ── Streak tracking ──────────────────────────────────────────────────────
    // These are the authoritative values stored in DB.
    // currentStreak / maxStreak / activeDays are updated automatically on
    // every createProblem (solved) call using the 3-case logic.
    // Manual setup is only allowed once (isSetup = false → true).
    currentStreak: { type: Number, default: 0, min: 0 },
    maxStreak:     { type: Number, default: 0, min: 0 },
    activeDays:    { type: Number, default: 0, min: 0 },
    daysTracked:   { type: Number, default: 0, min: 0 },  // today - startDate + 1
    consistency:   { type: Number, default: 0, min: 0 },  // activeDays/daysTracked * 100
    startDate:     { type: Date,   default: null },        // earliest UTC solve date
    lastSolvedDate: { type: Date, default: null },
    isSetup: { type: Boolean, default: false },
    isManualOverride: { type: Boolean, default: false },

    // ── LeetCode submission calendar ─────────────────────────────────────────
    // Stored as sorted array of YYYY-MM-DD UTC strings from LeetCode's
    // userCalendar.submissionCalendar (unix timestamp map).
    // UTC matches LeetCode's day boundary (resets at 00:00 UTC).
    // Used as the authoritative source for streak/activeDays — more accurate
    // than solvedDate from problems because it includes all submission days,
    // not just the problems we've manually tracked.
    submissionCalendarDates: { type: [String], default: [] },
    submissionCalendarUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
