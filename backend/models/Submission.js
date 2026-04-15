const mongoose = require('mongoose');

// One canonical record per problem — updated on each entry (API or manual)
const submissionSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    problemId:  { type: mongoose.Schema.Types.Mixed, required: true }, // Legacy LC (Number) + CF (String)
    platform:   { type: String, enum: ['LC', 'CF'], default: 'LC' },
    slug:       { type: String, required: true },         // e.g. "two-sum" or "cf-123-a"
    title:      { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    tags:       { type: [String], default: [] },
    link:       { type: String, default: '' },            // platform link

    // ── Solve metadata ────────────────────────────────────────────────────────
    dateSolved:      { type: Date, required: true },
    first_solved_at: { type: Date, default: null },       // immutable — set once
    last_updated_at: { type: Date, default: null },
    time_taken:      { type: Number, default: null },     // minutes
    attempts:        { type: Number, default: null },
    notes:           { type: String, default: '' },

    // ── Source: 'api' (LeetCode GraphQL) or 'manual' (user input) ────────────
    sources: {
      type:    [String],
      enum:    ['api', 'manual'],
      default: [],
    },

    // ── Soft delete / User Intent Lock ────────────────────────────────────────
    isDeleted: { type: Boolean, default: false, index: true },

    // ── Spaced Repetition (SM-2) ──────────────────────────────────────────────
    easeFactor:   { type: Number, default: 2.5 },
    interval:     { type: Number, default: 1 },
    nextReviewAt: { type: Date,   default: null },
    reviewCount:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

submissionSchema.index({ problemId: 1 }, { unique: true });
submissionSchema.index({ slug: 1 },       { unique: true });   // prevent slug duplicates
submissionSchema.index({ dateSolved: -1 });
submissionSchema.index({ nextReviewAt: 1 });

// ── Global Filters ───────────────────────────────────────────────────────────
submissionSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

submissionSchema.pre('countDocuments', function(next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

module.exports = mongoose.model('Submission', submissionSchema);
