const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    topics: { type: [String], default: [] },
    solved: { type: Boolean, default: true },
    notes: { type: String, default: '' },
    leetcodeLink: { type: String, required: true },
    solvedDate: { type: Date, default: null },
    date: { type: String, default: '' },       // "DD-MMM" format e.g. "21-Jan"
    revisionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Problem', problemSchema);
