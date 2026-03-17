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
    lastSolvedDate: { type: Date, default: null },
    isSetup: { type: Boolean, default: false }, // true after first manual setup
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
