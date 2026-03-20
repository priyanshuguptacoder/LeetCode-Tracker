const mongoose = require('mongoose');

// One canonical record per problem — updated on each sync or manual entry
const submissionSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    problemId:  { type: Number, required: true },  // LeetCode numeric ID (unique key)
    slug:       { type: String, default: '' },     // e.g. "two-sum"
    title:      { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    tags:       { type: [String], default: [] },
    language:   { type: String, default: null },   // auto-detected from file extension

    // ── Solve metadata ────────────────────────────────────────────────────────
    dateSolved:      { type: Date, required: true },  // most recent solve date
    first_solved_at: { type: Date, default: null },   // immutable — set once on insert
    last_updated_at: { type: Date, default: null },   // updated on every upsert
    time_taken:      { type: Number, default: null }, // minutes (manual entry preferred)
    attempts:        { type: Number, default: null }, // wrong attempts (manual preferred)
    status:          { type: String, enum: ['solved', 'revisited'], default: 'solved' },
    notes:           { type: String, default: '' },   // manual notes preserved

    // ── Source tracking ───────────────────────────────────────────────────────
    // Array so a problem can be both github + manual
    sources:   { type: [String], enum: ['github', 'manual'], default: [] },
    code_path: { type: String, default: null },       // path inside GitHub repo
    commitSha: { type: String, default: null },
    repoName:  { type: String, default: null },

    // ── Multiple solutions (one per language/file) ────────────────────────────
    solutions: [
      {
        language:    { type: String },
        filePath:    { type: String },
        commitSha:   { type: String },
        committedAt: { type: Date },
      }
    ],

    // ── Spaced Repetition (SM-2) ──────────────────────────────────────────────
    easeFactor:   { type: Number, default: 2.5 },
    interval:     { type: Number, default: 1 },
    nextReviewAt: { type: Date,   default: null },
    reviewCount:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

// DB-level unique constraint on problemId — prevents any duplicate inserts
submissionSchema.index({ problemId: 1 }, { unique: true });
submissionSchema.index({ dateSolved: -1 });
submissionSchema.index({ nextReviewAt: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
