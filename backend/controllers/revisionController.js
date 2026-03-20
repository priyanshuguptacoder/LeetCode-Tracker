const Problem = require('../models/Problem');
const { updateRevision } = require('../services/revisionService');

// GET /api/revision/due
exports.getDue = async (req, res) => {
  try {
    const now = new Date();
    const problems = await Problem.find({
      solved: true,
      nextRevisionDate: { $lte: now },
    })
      .sort({ revisionPriority: -1 })
      .limit(10);
    res.json({ success: true, data: problems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/revision/update
// Body: { problemId, feedback }  feedback: 'easy' | 'medium' | 'hard'
exports.update = async (req, res) => {
  const { problemId, feedback } = req.body;
  if (!problemId || !['easy', 'medium', 'hard'].includes(feedback)) {
    return res.status(400).json({ success: false, error: 'problemId and feedback (easy|medium|hard) required' });
  }
  try {
    const problem = await Problem.findOne({ id: parseInt(problemId) });
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    const updated = await updateRevision(problem, feedback);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
