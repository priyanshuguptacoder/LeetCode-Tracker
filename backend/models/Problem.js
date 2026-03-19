const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    topics: { type: [String], default: [] },
    solved: { type: Boolean, default: false },
    inProgress: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    leetcodeLink: { type: String, required: true },
    solvedDate: { type: Date, default: null },
    submittedAt: { type: Date, default: null }, // latest solve timestamp — source of truth for Recently Solved
    date: { type: String, default: '' },
    userDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: null },
    revisionCount: { type: Number, default: 0, min: 0 },
    lastRevisedAt: { type: Date, default: null },
    confidence: { type: Number, default: 3, min: 0, max: 5 }, // 0=very weak, 5=mastered
    nextRevisionAt: { type: Date, default: null }, // spaced repetition next date (= nextRevisionDue)
    targeted: { type: Boolean, default: false }, // manually marked as a goal
    targetedAt: { type: Date, default: null },   // when it was targeted
    isStriver: { type: Boolean, default: false }, // part of Striver sheet
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Problem', problemSchema);
