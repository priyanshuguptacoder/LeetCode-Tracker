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
    date: { type: String, default: '' },
    userDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: null },
    revisionCount: { type: Number, default: 0, min: 0 },
    lastRevisedAt: { type: Date, default: null },
    targeted: { type: Boolean, default: false }, // manually marked as a goal
    targetedAt: { type: Date, default: null },   // when it was targeted
    isStriver: { type: Boolean, default: false }, // part of Striver sheet
  },
  { timestamps: true }
);

module.exports = mongoose.model('Problem', problemSchema);
