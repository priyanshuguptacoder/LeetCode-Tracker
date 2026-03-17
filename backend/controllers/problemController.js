const Problem = require('../models/Problem');

// GET all problems
exports.getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find().sort({ id: 1 });
    res.json({ success: true, count: problems.length, data: problems });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch problems', message: error.message });
  }
};

// GET single problem by id
exports.getProblem = async (req, res) => {
  try {
    const problem = await Problem.findOne({ id: parseInt(req.params.id) });
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({ success: true, data: problem });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch problem', message: error.message });
  }
};

// POST create problem
exports.createProblem = async (req, res) => {
  try {
    const { id, title, difficulty, topics, solved, notes, leetcodeLink, solvedDate } = req.body;
    if (!id || !title || !difficulty || !leetcodeLink) {
      return res.status(400).json({ success: false, error: 'id, title, difficulty, and leetcodeLink are required' });
    }
    const exists = await Problem.findOne({ id: parseInt(id) });
    if (exists) return res.status(400).json({ success: false, error: 'Problem already exists' });

    const problem = await Problem.create({ id, title, difficulty, topics, solved, notes, leetcodeLink, solvedDate });
    res.status(201).json({ success: true, data: problem });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create problem', message: error.message });
  }
};

// PUT update problem (solved status, notes, etc.)
exports.updateProblem = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.id; // prevent id mutation

    const problem = await Problem.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { ...updates, ...(updates.solved && !updates.solvedDate ? { solvedDate: new Date() } : {}) },
      { returnDocument: 'after', runValidators: true }
    );
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({ success: true, data: problem });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update problem', message: error.message });
  }
};

// DELETE problem
exports.deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findOneAndDelete({ id: parseInt(req.params.id) });
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({ success: true, message: 'Problem deleted', data: problem });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete problem', message: error.message });
  }
};

// GET stats
exports.getStats = async (req, res) => {
  try {
    const problems = await Problem.find();
    const total = problems.length;
    const solved = problems.filter(p => p.solved).length;

    const byDifficulty = ['Easy', 'Medium', 'Hard'].reduce((acc, d) => {
      const group = problems.filter(p => p.difficulty === d);
      acc[d.toLowerCase()] = { total: group.length, solved: group.filter(p => p.solved).length };
      return acc;
    }, {});

    const byTopic = {};
    problems.forEach(p => {
      (p.topics || []).forEach(t => {
        if (!byTopic[t]) byTopic[t] = { total: 0, solved: 0 };
        byTopic[t].total++;
        if (p.solved) byTopic[t].solved++;
      });
    });

    res.json({ success: true, data: { total, solved, notSolved: total - solved, difficulty: byDifficulty, topics: byTopic } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to calculate stats', message: error.message });
  }
};
