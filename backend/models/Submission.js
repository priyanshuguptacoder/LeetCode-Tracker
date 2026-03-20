const mongoose = require('mongoose');

// Stores one submission record per problem solve/revisit from GitHub (LeetSync)
const submissionSchema = new mongoose.Schema(
  {
    problemId:   { type: Number, required: true },          // LeetCode problem ID
    slug:        { type: String, required: true },          // folder name e.g. "two-sum"
    title:       { type: String, required: true },
    difficulty:  { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    tags:        { type: [String], default: [] },
    dateSolved:  { type: Date, required: true },
    timeTaken:   { type: Number, default: null },           // minutes
    attempts:    { type: Number, default: 1 },
    status:      { type: String, enum: ['solved', 'revisited'], default: 'solved' },
    notes:       { type: String, default: '' },
    commitSha:   { type: String, default: null },           // GitHub commit that triggered sync
    repoName:    { type: String, default: null },           // source GitHub repo

    // ── Spaced Repetition ──────────────────────────────────────────────────
    easeFactor:    { type: Number, default: 2.5 },          // SM-2 ease factor
    interval:      { type: Number, default: 1 },            // days until next review
    nextReviewAt:  { type: Date, default: null },           // scheduled next review date
    reviewCount:   { type: Number, default: 0 },            // total reviews done
  },
  { timestamps: true }
);

// Unique per problem — one canonical record, updated on each sync
submissionSchema.index({ problemId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
