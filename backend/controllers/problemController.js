const Problem = require('../models/Problem');
const Settings = require('../models/Settings');

// ─── Timezone helper ─────────────────────────────────────────────────────────
const TZ = 'Asia/Kolkata';

function todayStr(tz) {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz || TZ });
}

function dateStr(date, tz) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-CA', { timeZone: tz || TZ });
}

// Calendar-day difference between two YYYY-MM-DD strings (b minus a)
function dayDiff(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// ─── Streak update — 3-case logic ────────────────────────────────────────────
async function applyStreakUpdate(settings) {
  const today = todayStr();
  const last  = settings.lastSolvedDate ? dateStr(settings.lastSolvedDate) : null;
  let { currentStreak, maxStreak, activeDays } = settings;

  if (last === today) {
    // CASE 1: already solved today — no change
  } else if (last && dayDiff(last, today) === 1) {
    // CASE 2: consecutive day
    currentStreak += 1;
    activeDays    += 1;
  } else {
    // CASE 3: first solve ever OR gap > 1 day — reset streak
    currentStreak = 1;
    activeDays   += 1;
  }

  if (currentStreak > maxStreak) maxStreak = currentStreak;
  if (activeDays < currentStreak) activeDays = currentStreak;

  return Settings.findOneAndUpdate(
    { key: 'global' },
    { $set: { currentStreak, maxStreak, activeDays, lastSolvedDate: new Date() } },
    { new: true, upsert: true }
  );
}

function streakPayload(s) {
  return {
    currentStreak:  s.currentStreak,
    maxStreak:      s.maxStreak,
    activeDays:     s.activeDays,
    lastSolvedDate: s.lastSolvedDate,
    isSetup:        s.isSetup,
  };
}

// ─── GET /api/problems/streak ─────────────────────────────────────────────────
exports.getStreak = async (req, res) => {
  try {
    let s = await Settings.findOne({ key: 'global' });
    if (!s) s = await Settings.create({ key: 'global' });
    res.json({ success: true, data: streakPayload(s) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch streak', message: err.message });
  }
};

// ─── PUT /api/problems/streak ─────────────────────────────────────────────────
exports.updateStreak = async (req, res) => {
  try {
    const { currentStreak, maxStreak, activeDays, force } = req.body;
    let s = await Settings.findOne({ key: 'global' });
    if (!s) s = await Settings.create({ key: 'global' });

    if (s.isSetup && !force) {
      return res.status(403).json({ success: false, error: 'Already set up. Pass force:true to override.' });
    }

    const cs = parseInt(currentStreak);
    const ms = parseInt(maxStreak);
    const ad = parseInt(activeDays);

    if (isNaN(cs) || cs < 0) return res.status(400).json({ success: false, error: 'currentStreak must be >= 0' });
    if (isNaN(ms) || ms < cs) return res.status(400).json({ success: false, error: 'maxStreak must be >= currentStreak' });
    if (isNaN(ad) || ad < cs) return res.status(400).json({ success: false, error: 'activeDays must be >= currentStreak' });

    s = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: { currentStreak: cs, maxStreak: ms, activeDays: ad, isSetup: true } },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: streakPayload(s) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update streak', message: err.message });
  }
};

// ─── GET /api/problems ────────────────────────────────────────────────────────
exports.getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find().sort({ id: 1 });
    res.json({ success: true, count: problems.length, data: problems });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch problems', message: err.message });
  }
};

// ─── GET /api/problems/:id ────────────────────────────────────────────────────
exports.getProblem = async (req, res) => {
  try {
    const problem = await Problem.findOne({ id: parseInt(req.params.id) });
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({ success: true, data: problem });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch problem', message: err.message });
  }
};

// ─── POST /api/problems ───────────────────────────────────────────────────────
exports.createProblem = async (req, res) => {
  try {
    const { id, title, difficulty, topics, solved, notes, leetcodeLink, solvedDate } = req.body;
    if (!id || !title || !difficulty || !leetcodeLink) {
      return res.status(400).json({ success: false, error: 'id, title, difficulty, and leetcodeLink are required' });
    }
    const exists = await Problem.findOne({ id: parseInt(id) });
    if (exists) return res.status(400).json({ success: false, error: 'Problem #' + id + ' already exists' });

    const isSolved = solved === true || solved === 'true';
    const resolvedSolvedDate = isSolved ? (solvedDate ? new Date(solvedDate) : new Date()) : null;

    const problem = await Problem.create({
      id: parseInt(id), title, difficulty,
      topics: Array.isArray(topics) ? topics : [],
      solved: isSolved, notes: notes || '', leetcodeLink,
      solvedDate: resolvedSolvedDate,
    });

    let streakData = null;
    if (isSolved) {
      let s = await Settings.findOne({ key: 'global' });
      if (!s) s = await Settings.create({ key: 'global' });
      if (s.isSetup) {
        const updated = await applyStreakUpdate(s);
        streakData = streakPayload(updated);
      } else {
        streakData = streakPayload(s);
      }
    }
    res.status(201).json({ success: true, data: problem, streak: streakData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create problem', message: err.message });
  }
};

// ─── PUT /api/problems/:id ────────────────────────────────────────────────────
exports.updateProblem = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    if (updates.solved !== undefined) updates.solved = updates.solved === true || updates.solved === 'true';
    if (updates.solved === true && !updates.solvedDate) updates.solvedDate = new Date();
    if (updates.solved === false) updates.solvedDate = null;

    const problem = await Problem.findOneAndUpdate(
      { id: parseInt(req.params.id) }, updates, { returnDocument: 'after', runValidators: true }
    );
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });

    let streakData = null;
    if (updates.solved === true) {
      let s = await Settings.findOne({ key: 'global' });
      if (!s) s = await Settings.create({ key: 'global' });
      if (s.isSetup) {
        const updated = await applyStreakUpdate(s);
        streakData = streakPayload(updated);
      } else {
        streakData = streakPayload(s);
      }
    }
    res.json({ success: true, data: problem, streak: streakData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update problem', message: err.message });
  }
};

// ─── POST /api/problems/:id/revise ───────────────────────────────────────────
exports.reviseProblem = async (req, res) => {
  try {
    const problem = await Problem.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $inc: { revisionCount: 1 }, $set: { lastRevisedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({
      success: true,
      data: { id: problem.id, revisionCount: problem.revisionCount, lastRevisedAt: problem.lastRevisedAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record revision', message: err.message });
  }
};

// ─── POST /api/problems/:id/unrevise ─────────────────────────────────────────
exports.unreviseProblem = async (req, res) => {
  try {
    const current = await Problem.findOne({ id: parseInt(req.params.id) });
    if (!current) return res.status(404).json({ success: false, error: 'Problem not found' });
    if ((current.revisionCount || 0) === 0) {
      return res.status(400).json({ success: false, error: 'revisionCount is already 0' });
    }
    const newCount = current.revisionCount - 1;
    const problem = await Problem.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: { revisionCount: newCount, lastRevisedAt: newCount === 0 ? null : current.lastRevisedAt } },
      { new: true, runValidators: true }
    );
    res.json({
      success: true,
      data: { id: problem.id, revisionCount: problem.revisionCount, lastRevisedAt: problem.lastRevisedAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to unrevise', message: err.message });
  }
};

// ─── DELETE /api/problems/:id ─────────────────────────────────────────────────
exports.deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findOneAndDelete({ id: parseInt(req.params.id) });
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({ success: true, data: problem });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete problem', message: err.message });
  }
};

// ─── GET /api/problems/stats ──────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const problems = await Problem.find();
    const total = problems.length;
    const solved = problems.filter(p => p.solved).length;

    const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
    const byTopic = {};
    problems.forEach(p => {
      if (p.solved) {
        byDifficulty[p.difficulty] = (byDifficulty[p.difficulty] || 0) + 1;
        (p.topics || []).forEach(t => { byTopic[t] = (byTopic[t] || 0) + 1; });
      }
    });

    res.json({ success: true, data: { total, solved, byDifficulty, byTopic } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats', message: err.message });
  }
};

// ─── GET /api/problems/settings ───────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    let s = await Settings.findOne({ key: 'global' });
    if (!s) s = await Settings.create({ key: 'global' });
    res.json({ success: true, data: s });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings', message: err.message });
  }
};

// ─── POST /api/problems/align ─────────────────────────────────────────────────
// Bulk upsert problems from the frontend dataset (seed-style).
// Returns current streak payload after upsert.
function parseDDMMMToDate(str) {
  if (!str) return null;
  const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const [day, mon] = str.split('-');
  if (!MONTHS.hasOwnProperty(mon)) return null;
  const year = new Date().getFullYear();
  return new Date(year, MONTHS[mon], parseInt(day));
}

exports.alignProblems = async (req, res) => {
  try {
    const { problems } = req.body;
    if (!Array.isArray(problems) || problems.length === 0) {
      return res.status(400).json({ success: false, error: 'problems array is required' });
    }

    const ops = problems.map(p => {
      const isSolved = p.solved === true || p.status === 'Done';
      const solvedDate = isSolved
        ? (p.solvedDate ? new Date(p.solvedDate) : parseDDMMMToDate(p.date))
        : null;
      return {
        updateOne: {
          filter: { id: parseInt(p.id ?? p.number) },
          update: {
            $set: {
              id: parseInt(p.id ?? p.number),
              title: p.title,
              difficulty: p.difficulty || 'Medium',
              topics: Array.isArray(p.topics) ? p.topics : [],
              solved: isSolved,
              notes: p.notes || '',
              leetcodeLink: p.leetcodeLink || p.link || '',
              solvedDate,
            }
          },
          upsert: true,
        }
      };
    });

    await Problem.bulkWrite(ops);

    let s = await Settings.findOne({ key: 'global' });
    if (!s) s = await Settings.create({ key: 'global' });

    res.json({ success: true, count: ops.length, streak: streakPayload(s) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Align failed', message: err.message });
  }
};
