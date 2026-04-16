// updated: multi-platform support (LeetCode + Codeforces)
const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema(
  {
    // ── Platform Support ──────────────────────────────────────────────────
    // uniqueId: canonical cross-platform identity
    // Examples: "LC-1", "CF-1700A"
    // NOTE: this replaces legacy `id` as the stable key.
    uniqueId: { type: String, required: true, unique: true, index: true },
    // id: legacy alias kept for backwards compatibility (will mirror uniqueId)
    id: { type: String, required: true, index: true },
    // platform: 'LC' | 'CF' | future platforms
    platform: { type: String, enum: ['LC', 'CF'], default: 'LC', required: true, index: true },
    // Codeforces explicit references
    contestId: { type: Number, default: null },
    index: { type: String, default: null },
    // rating: Codeforces rating (e.g. 800..3500)
    rating: { type: Number, default: null },
    // problemIdNum: numeric ID for stable numeric sorting (especially LeetCode)
    problemIdNum: { type: Number, default: null, index: true },
    // rawDifficulty: original difficulty value (rating for CF, string for LC)
    rawDifficulty: { type: mongoose.Schema.Types.Mixed, default: null },
    // difficultyRating: normalized 1-5 scale for consistent comparison
    difficultyRating: { type: Number, min: 1, max: 5, default: null },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    topics: { type: [String], default: [] },
    solved: { type: Boolean, default: false },
    inProgress: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    // platformLink: generic link field (replaces leetcodeLink)
    platformLink: { type: String, required: true },
    // legacy field kept for backward compatibility
    leetcodeLink: { type: String, required: false },
    solvedDate: { type: Date, default: null },
    submittedAt: { type: Date, default: null }, // latest solve timestamp — source of truth for Recently Solved
    lastSubmittedAt: { type: Date, default: null, index: true }, // always updated on every sync
    date: { type: String, default: '' },
    userDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: null },
    revisionCount: { type: Number, default: 0, min: 0 },
    lastRevisedAt: { type: Date, default: null },
    confidence: { type: Number, default: 3, min: 0, max: 5 }, // 0=very weak, 5=mastered
    nextRevisionAt: { type: Date, default: null }, // spaced repetition next date (= nextRevisionDue)
    targeted: { type: Boolean, default: false }, // manually marked as a goal
    targetedAt: { type: Date, default: null },   // when it was targeted
    isStriver: { type: Boolean, default: false }, // part of Striver sheet
    isTLE: { type: Boolean, default: false },      // CF TLE sheet (rating 1200-1800 or key topics)
    // ── Revision Intelligence Engine ──────────────────────────────────────
    solveTime: { type: Number, default: null },       // minutes taken to solve
    hintsUsed: { type: Boolean, default: false },     // used hint while solving
    wrongAttempts: { type: Number, default: 0 },      // wrong submissions before AC
    mistakeType: { type: String, default: null,       // root cause of struggle
      enum: [null, 'pattern_not_recognized', 'logic_error', 'edge_case_missed',
             'optimization_issue', 'forgot_approach', 'slow_execution'] },
    needsRevision: { type: Boolean, default: false }, // auto-flagged for revision
    lastRevisionSuccess: { type: Boolean, default: null }, // last attempt result
    lastRevisionTime: { type: Number, default: null },     // minutes in last revision
    consecutiveSuccess: { type: Number, default: 0 },      // streak of successful revisions
    failureLoopFlagged: { type: Boolean, default: false }, // revision_count>=3 AND LOW
    // ── SM-2 spaced repetition (analytics engine) ─────────────────────────
    easeFactor:       { type: Number, default: 2.5 },
    interval:         { type: Number, default: 1 },
    nextRevisionDate: { type: Date,   default: null }, // SM-2 computed next date
    revisionPriority: { type: Number, default: 0 },    // higher = more urgent
    // providerTitle: display name for the platform
    providerTitle: { type: String, default: function() { return this.platform === 'CF' ? 'Codeforces' : 'LeetCode'; } },
    // ── Soft delete / User Intent Lock ────────────────────────────────────
    isDeleted:  { type: Boolean, default: false, index: true },
    deletedAt:  { type: Date,    default: null },
  },
  { timestamps: true }
);

problemSchema.index({ platform: 1, solved: 1 });
problemSchema.index({ solvedDate: -1 });
problemSchema.index({ nextRevisionAt: 1 });
problemSchema.index({ solved: 1 });
problemSchema.index({ topics: 1 });
problemSchema.index({ platform: 1, difficultyRating: 1 });
problemSchema.index({ uniqueId: 1 }, { unique: true });
problemSchema.index({ isTLE: 1 });
problemSchema.index({ isStriver: 1 });

// ── Global Filters ───────────────────────────────────────────────────────────
problemSchema.pre(/^find/, function() {
  this.where({ isDeleted: { $ne: true } });
});

problemSchema.pre('countDocuments', function() {
  this.where({ isDeleted: { $ne: true } });
});

// ── Invariants ───────────────────────────────────────────────────────────────
// 1) `id` always mirrors `uniqueId` (legacy compatibility)
// 2) If `solved === true`, `solvedDate` MUST be a valid Date (never null)
problemSchema.pre('validate', async function() {
  if (this.uniqueId && (!this.id || this.id !== this.uniqueId)) {
    this.id = this.uniqueId;
  }

  if (this.solved === true) {
    if (!this.solvedDate) {
      this.solvedDate = this.lastSubmittedAt || this.submittedAt || new Date();
    }
  }
});

module.exports = mongoose.model('Problem', problemSchema);
