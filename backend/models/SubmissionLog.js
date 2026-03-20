const mongoose = require('mongoose');

// Per-attempt log — one document per submission event (not per problem)
const submissionLogSchema = new mongoose.Schema({
  problemId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  status:      { type: String, enum: ['accepted', 'wrong', 'tle'], required: true },
  submittedAt: { type: Date, required: true },
});

submissionLogSchema.index({ status: 1, submittedAt: 1 });
submissionLogSchema.index({ problemId: 1 });

module.exports = mongoose.model('SubmissionLog', submissionLogSchema);
