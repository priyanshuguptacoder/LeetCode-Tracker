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
  // Parse as local midnight to avoid UTC offset issues
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  return Math.round((dateB.getTime() - dateA.getTime()) / 86400000);
}

// ─── Streak update — 3-case logic ────────────────────────────────────────────
async function applyStreakUpdate(settings) {
  const today = todayStr(); // YYYY-MM-DD in IST
  // Always convert lastSolvedDate to IST date string for comparison
  const last = settings.lastSolvedDate ? dateStr(settings.lastSolvedDate) : null;
  let { currentStreak, maxStreak, activeDays } = settings;

  console.log(`[streak] today=${today} last=${last} currentStreak=${currentStreak} maxStreak=${maxStreak} activeDays=${activeDays}`);

  if (last === today) {
    // CASE 1: already solved today — no change
    console.log('[streak] Case 1: same day, no change');
  } else if (last && dayDiff(last, today) === 1) {
    // CASE 2: consecutive day — extend streak
    currentStreak += 1;
    activeDays    += 1;
    console.log(`[streak] Case 2: consecutive day → streak=${currentStreak} activeDays=${activeDays}`);
  } else {
    // CASE 3: first solve ever OR gap > 1 day — reset streak to 1
    currentStreak = 1;
    activeDays   += 1;
    console.log(`[streak] Case 3: gap/new → streak=1 activeDays=${activeDays}`);
  }

  if (currentStreak > maxStreak) maxStreak = currentStreak;
  if (activeDays < currentStreak) activeDays = currentStreak;

  // Store lastSolvedDate as start-of-day in IST to avoid timezone drift on next read
  const [ty, tm, td] = today.split('-').map(Number);
  const lastSolvedDate = new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0));

  return Settings.findOneAndUpdate(
    { key: 'global' },
    { $set: { currentStreak, maxStreak, activeDays, lastSolvedDate } },
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
    const { currentStreak, maxStreak, activeDays, lastSolvedDate, force } = req.body;
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

    const updateFields = { currentStreak: cs, maxStreak: ms, activeDays: ad, isSetup: true };
    if (lastSolvedDate) updateFields.lastSolvedDate = new Date(lastSolvedDate);
    // If no lastSolvedDate provided, set to UTC midnight of today in IST to avoid timezone drift
    if (!lastSolvedDate) {
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const [ty, tm, td] = todayIST.split('-').map(Number);
      updateFields.lastSolvedDate = new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0));
    }

    s = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: updateFields },
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
    const { id, title, difficulty, topics, solved, notes, leetcodeLink, solvedDate, targeted, targetedAt } = req.body;
    if (!id || !title || !difficulty || !leetcodeLink) {
      return res.status(400).json({ success: false, error: 'id, title, difficulty, and leetcodeLink are required' });
    }
    const exists = await Problem.findOne({ id: parseInt(id) });
    if (exists) return res.status(400).json({ success: false, error: 'Problem #' + id + ' already exists' });

    const isSolved = solved === true || solved === 'true';
    const isTargeted = targeted === true || targeted === 'true';
    const resolvedSolvedDate = isSolved ? (solvedDate ? new Date(solvedDate) : new Date()) : null;
    const resolvedTargetedAt = isTargeted ? (targetedAt ? new Date(targetedAt) : new Date()) : null;

    const problem = await Problem.create({
      id: parseInt(id), title, difficulty,
      topics: Array.isArray(topics) ? topics : [],
      solved: isSolved, notes: notes || '', leetcodeLink,
      solvedDate: resolvedSolvedDate,
      targeted: isTargeted,
      targetedAt: resolvedTargetedAt,
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

    // Fetch BEFORE updating to check if it was previously unsolved
    const before = await Problem.findOne({ id: parseInt(req.params.id) });
    if (!before) return res.status(404).json({ success: false, error: 'Problem not found' });

    const problem = await Problem.findOneAndUpdate(
      { id: parseInt(req.params.id) }, updates, { returnDocument: 'after', runValidators: true }
    );

    let streakData = null;
    // Only update streak if problem is being NEWLY marked as solved (was not solved before)
    const isNewlySolved = updates.solved === true && before.solved === false;
    if (isNewlySolved) {
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

// ─── POST /api/problems/:id/target ───────────────────────────────────────────
exports.targetProblem = async (req, res) => {
  try {
    const problem = await Problem.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: { targeted: true, targetedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({ success: true, data: { id: problem.id, targeted: problem.targeted, targetedAt: problem.targetedAt } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to target problem', message: err.message });
  }
};

// ─── POST /api/problems/:id/untarget ─────────────────────────────────────────
exports.untargetProblem = async (req, res) => {
  try {
    const problem = await Problem.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: { targeted: false, targetedAt: null } },
      { new: true, runValidators: true }
    );
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    res.json({ success: true, data: { id: problem.id, targeted: problem.targeted, targetedAt: problem.targetedAt } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to untarget problem', message: err.message });
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
