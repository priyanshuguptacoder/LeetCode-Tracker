const Problem = require('../models/Problem');
const { updateRevision } = require('../services/revisionService');

// GET /api/revision/due
// Returns problems needing revision from BOTH LC and CF platforms
exports.getDue = async (req, res) => {
  try {
    const now = new Date();
    const [dueNow, upcoming, allRevisionProblems] = await Promise.all([
      // Due now: nextRevisionAt <= now (includes both LC and CF)
      // Base condition: solvedDate exists (unified with all analytics)
      Problem.find({
        solved: true,
        isDeleted: { $ne: true },
        solvedDate: { $ne: null },
        nextRevisionAt: { $lte: now },
      })
        .sort({ revisionPriority: -1, lastSubmittedAt: -1 })
        .limit(20)
        .lean(),
      
      // Upcoming: nextRevisionAt > now
      // Base condition: solvedDate exists (unified with all analytics)
      Problem.find({
        solved: true,
        isDeleted: { $ne: true },
        solvedDate: { $ne: null },
        nextRevisionAt: { $gt: now },
      })
        .sort({ nextRevisionAt: 1 })
        .limit(10)
        .lean(),
      
      // All problems with revisionCount > 0 (for revision list)
      // Base condition: solvedDate exists (unified with all analytics)
      Problem.find({
        solved: true,
        isDeleted: { $ne: true },
        solvedDate: { $ne: null },
        revisionCount: { $gt: 0 },
      })
        .sort({ lastRevisedAt: -1 })
        .limit(50)
        .lean()
    ]);

    // Ensure safe array return (never undefined)
    res.json({
      success: true,
      data: {
        dueNow: dueNow || [],
        upcoming: upcoming || [],
        allRevisionProblems: allRevisionProblems || []
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message,
      data: { dueNow: [], upcoming: [], allRevisionProblems: [] }
    });
  }
};

// GET /api/revision/stats
// Stats for BOTH platforms
exports.getStats = async (req, res) => {
  try {
    const stats = await Problem.aggregate([
      // Base condition: solvedDate exists (unified with all analytics)
      { $match: { solved: true, isDeleted: { $ne: true }, solvedDate: { $ne: null } } },
      {
        $group: {
          _id: '$platform',
          totalSolved: { $sum: 1 },
          avgRevisionCount: { $avg: '$revisionCount' },
          needsRevision: {
            $sum: {
              $cond: [{ $gt: ['$revisionCount', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, data: [] });
  }
};

// POST /api/revision/update
// Body: { problemId, feedback }  feedback: 'easy' | 'medium' | 'hard'
// NOTE: problemId is the STRING id (e.g., "LC-1", "CF-123A")
exports.update = async (req, res) => {
  const { problemId, feedback } = req.body;
  if (!problemId || !['easy', 'medium', 'hard'].includes(feedback)) {
    return res.status(400).json({ 
      success: false, 
      error: 'problemId (string) and feedback (easy|medium|hard) required' 
    });
  }
  try {
    // Find by string id (NOT parseInt - id is like "LC-1" or "CF-123A")
    const problem = await Problem.findOne({ id: problemId.toString() });
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    const updated = await updateRevision(problem, feedback);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
