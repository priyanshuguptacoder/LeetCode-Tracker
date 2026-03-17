const Problem = require('../models/Problem');
const Settings = require('../models/Settings');

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

// PUT update problem
exports.updateProblem = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.id; 

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

// GET global settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'global' });
    if (!settings) {
      settings = await Settings.create({ key: 'global' });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings', message: error.message });
  }
};

function computeStreaks(problems, timeZone = 'Asia/Kolkata') {
  const solvedDates = new Set();

  problems.forEach(p => {
    if (p.solved && p.solvedDate) {
      const dateStr = new Date(p.solvedDate).toLocaleDateString('en-CA', { timeZone });
      solvedDates.add(dateStr);
    } else if (p.solved && p.date) {
      const d = parseDDMMMToDate(p.date);
      if (d) {
        solvedDates.add(d.toLocaleDateString('en-CA', { timeZone }));
      }
    }
  });

  const uniqueDates = Array.from(solvedDates).sort(); // ascending YYYY-MM-DD
  const activeDays = uniqueDates.length;

  let currentStreak = 0;
  let maxStreak = uniqueDates.length > 0 ? 1 : 0;

  if (uniqueDates.length > 0) {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone });

    // Current streak: strict — must have solved today, then walk backwards
    if (solvedDates.has(todayStr)) {
      // Walk backwards from today using local date arithmetic
      let checkDate = new Date(new Date().toLocaleDateString('en-CA', { timeZone }));
      while (true) {
        const ds = checkDate.toLocaleDateString('en-CA', { timeZone });
        if (solvedDates.has(ds)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Max streak: walk ascending sorted dates
    let tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);
  }

  return { currentStreak, maxStreak, activeDays };
}

// Helper for Align
const MONTH_MAP_ALIGN = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDDMMMToDate(dateStr) {
  if (!dateStr) return null;
  const [day, mon] = dateStr.split('-');
  const monthIndex = MONTH_MAP_ALIGN[mon];
  if (monthIndex === undefined) return null;
  const d = new Date(2026, monthIndex, parseInt(day, 10));
  return isNaN(d.getTime()) ? null : d;
}

// POST /api/problems/align
exports.alignProblems = async (req, res) => {
  try {
    const { problems, timeZone = 'Asia/Kolkata' } = req.body;
    if (!problems || !Array.isArray(problems)) {
      return res.status(400).json({ success: false, error: 'problems[] array is required' });
    }

    const bulkOps = problems.map((p) => {
      const solvedDate = p.solvedDate
        ? new Date(p.solvedDate)
        : parseDDMMMToDate(p.date);
      return {
        updateOne: {
          filter: { id: p.number || p.id },
          update: {
            $set: {
              id: p.number || p.id,
              title: p.title,
              difficulty: p.difficulty,
              topics: p.topics || (p.pattern ? [p.pattern] : []),
              solved: p.solved !== undefined ? p.solved : true,
              leetcodeLink: p.link || p.leetcodeLink || '',
              date: p.date || '',
              revisionCount: p.revisionCount || 0,
              solvedDate: solvedDate,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Problem.bulkWrite(bulkOps, { ordered: false });

    await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: { lastSyncAt: new Date() } },
      { upsert: true }
    );

    const allProblems = await Problem.find().sort({ id: 1 });
    const freshSettings = await Settings.findOne({ key: 'global' });
    const metrics = computeStreaks(allProblems, timeZone);

    res.json({
      success: true,
      message: `Align complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
      stats: {
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        total: allProblems.length,
      },
      settings: freshSettings,
      metrics,
      data: allProblems,
    });
  } catch (error) {
    console.error('Align error:', error);
    res.status(500).json({ success: false, error: 'Align failed', message: error.message });
  }
};
