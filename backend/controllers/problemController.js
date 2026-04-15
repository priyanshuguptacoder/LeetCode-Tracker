// updated: providerTitle hardening, streak computed from statsEngine
const Problem    = require('../models/Problem');
const Submission = require('../models/Submission');
const Settings   = require('../models/Settings');
const { computeStats, getUTCDayKey } = require('../utils/statsEngine');

// ─── todayUTCKey — thin wrapper used by applyStreakUpdate ─────────────────────
function todayUTCKey() { return getUTCDayKey(new Date()); }

// ─── STREAK REBUILD — delegates to statsEngine, writes result to Settings ─────
// Called after: delete, sync, manual add/update.
// calendarDates: optional YYYY-MM-DD IST strings from LeetCode submissionCalendar.
// When provided, streak is computed from calendar (matches LeetCode exactly).
// When null, falls back to problem solvedDates from DB.
async function rebuildStreak(calendarDates = null) {
  const rawProblems = await Problem.find(
    {
      solved: true,
      isDeleted: { $ne: true },
      $or: [
        { solvedDate: { $ne: null } },
        { lastSubmittedAt: { $ne: null } },
      ],
    },
    { solvedDate: 1, lastSubmittedAt: 1 }
  ).lean();

  // Normalize: use lastSubmittedAt as fallback if solvedDate is null
  const problems = rawProblems.map(p => ({
    ...p,
    solvedDate: p.solvedDate || p.lastSubmittedAt,
  }));

  // If no calendarDates passed in, check if we have stored ones in Settings
  let effectiveCalendarDates = calendarDates;
  if (!effectiveCalendarDates) {
    const stored = await Settings.findOne({ key: 'global' }, { submissionCalendarDates: 1 }).lean();
    if (stored?.submissionCalendarDates?.length > 0) {
      effectiveCalendarDates = stored.submissionCalendarDates;
      console.log(`[STREAK REBUILD] using stored submissionCalendar (${(effectiveCalendarDates || []).length} dates)`);
    }
  }

  const stats = computeStats(problems, effectiveCalendarDates);

  if (!stats.isValid) {
    console.error('[STREAK REBUILD] Invariant violations:', stats.errors);
  }

  const lastSolvedDate = (stats?.days?.length || 0) > 0
    ? new Date(stats.days[stats.days.length - 1] + 'T00:00:00Z')
    : null;

  await Settings.findOneAndUpdate(
    { key: 'global' },
    {
      $set: {
        currentStreak: stats.currentStreak,
        maxStreak:     stats.maxStreak,
        activeDays:    stats.activeDays,
        daysTracked:   stats.daysTracked,
        consistency:   stats.consistency,
        startDate:     stats.startDate ? new Date(stats.startDate + 'T00:00:00Z') : null,
        lastSolvedDate,
      },
    },
    { upsert: true }
  );

  return stats;
}

// ─── applyStreakUpdate — incremental update after a single new solve ──────────
// Runs a full rebuild so stats stay consistent with statsEngine.
async function applyStreakUpdate() {
  return rebuildStreak();
}

// ─── streakPayload — shapes stats for API responses ──────────────────────────
function streakPayload(stats) {
  return {
    currentStreak:  stats.currentStreak  ?? 0,
    maxStreak:      stats.maxStreak      ?? 0,
    activeDays:     stats.activeDays     ?? 0,
    daysTracked:    stats.daysTracked    ?? 0,
    consistency:    stats.consistency    ?? 0,
    startDate:      stats.startDate      ?? null,
  };
}

// ─── GET /api/problems/streak ─────────────────────────────────────────────────
exports.getStreak = async (req, res) => {
  try {
    const [rawProblems, settings] = await Promise.all([
      Problem.find(
        {
          solved: true,
          isDeleted: { $ne: true },
          $or: [
            { solvedDate: { $ne: null } },
            { lastSubmittedAt: { $ne: null } },
          ],
        },
        { solvedDate: 1, lastSubmittedAt: 1 }
      ).lean(),
      Settings.findOne({ key: 'global' }, { submissionCalendarDates: 1 }).lean(),
    ]);

    // Normalize: use lastSubmittedAt as fallback if solvedDate is null
    const problems = rawProblems.map(p => ({
      ...p,
      solvedDate: p.solvedDate || p.lastSubmittedAt,
    }));

    const calendarDates = settings?.submissionCalendarDates?.length > 0
      ? settings.submissionCalendarDates
      : null;

    const stats = computeStats(problems, calendarDates);

    // Debug log
    console.log('[STREAK] count:', problems.length, '| currentStreak:', stats.currentStreak, '| activeDays:', stats.activeDays);

    if (!stats.isValid) {
      return res.status(500).json({ success: false, error: 'Stats invariant violation', errors: stats.errors });
    }
    res.json({ success: true, data: streakPayload(stats) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch streak', message: err.message });
  }
};

// ─── GET /api/problems ────────────────────────────────────────────────────────
// Query params: ?platform=LC | ?platform=CF | ?platform=ALL (default: ALL)
exports.getAllProblems = async (req, res) => {
  const { platform = 'ALL', page, limit, sort = 'recent' } = req.query;
  console.log(`[DEBUG] getAllProblems platform: ${platform}, sort: ${sort}`);

  try {
    const p = page ? parseInt(page, 10) || 1 : 1;
    const l = page ? (parseInt(limit, 10) || 50) : 0; 
    
    const platformFilter = platform !== 'ALL' ? { platform: platform.toUpperCase() } : {};
    
    // ─── SORTING LOGIC WITH DEFENSIVE FALLBACK ─────────────────────────────────
    // If numeric field is missing, use 999999 so it goes LAST (not first)
    let sortStage = {};
    if (sort === 'recent') {
      sortStage = { lastSubmittedAt: -1, _id: -1 };
    } else {
      // problem order — TRUE NUMERIC SORTING (no lexicographic)
      if (platform === 'CF') {
        sortStage = { contestId: 1, index: 1 };
      } else if (platform === 'LC') {
        sortStage = { problemIdNum: 1, _id: 1 };
      } else {
        sortStage = { platform: 1, problemIdNum: 1, contestId: 1, index: 1 };
      }
    }

    // Build aggregation pipeline with defensive numeric conversion
    const pipeline = [
      { $match: platformFilter },
      // Add computed fields with fallback for missing numeric values
      {
        $addFields: {
          // DEFENSIVE: Ensure numeric fields exist with fallback to 999999 (goes last)
          problemIdNum: {
            $cond: [
              { $and: [{ $ne: ['$problemIdNum', null] }, { $ne: ['$problemIdNum', ''] }] },
              { $toInt: '$problemIdNum' },
              999999
            ]
          },
          contestId: {
            $cond: [
              { $and: [{ $ne: ['$contestId', null] }, { $ne: ['$contestId', ''] }] },
              { $toInt: '$contestId' },
              999999
            ]
          },
          index: { $ifNull: ['$index', ''] },
          // Ensure safe defaults for other fields
          title: { $ifNull: ['$title', 'Untitled Problem'] },
          difficulty: { $ifNull: ['$difficulty', 'Medium'] },
          topics: { $ifNull: ['$topics', []] },
          solved: { $ifNull: ['$solved', false] },
          revisionCount: { $ifNull: ['$revisionCount', 0] },
        }
      },
      { $sort: sortStage },
      ...(l > 0 ? [{ $skip: (p - 1) * l }, { $limit: l }] : [])
    ];

    const [rawProblems, rawTotal] = await Promise.all([
      Problem.aggregate(pipeline),
      Problem.countDocuments(platformFilter)
    ]);

    const problems = Array.isArray(rawProblems) ? rawProblems : [];
    const total = typeof rawTotal === 'number' ? rawTotal : 0;
    console.log(`[DEBUG] result count: ${problems.length}, total count: ${total}`);

    // Final defensive transformation
    const data = problems.map(p => {
      const obj = p || {};
      // Ensure numeric types for frontend
      if (obj.problemIdNum != null) obj.problemIdNum = Number(obj.problemIdNum);
      if (obj.contestId != null) obj.contestId = Number(obj.contestId);
      if (obj.revisionCount != null) obj.revisionCount = Number(obj.revisionCount);
      
      if (!obj.providerTitle) {
        obj.providerTitle = obj.platform === 'CF' ? 'Codeforces' : 'LeetCode';
      }
      if (!obj.leetcodeLink && obj.platformLink) {
        obj.leetcodeLink = obj.platformLink;
      }
      return obj;
    });
    
    return res.json({ 
      success: true, 
      total,
      page: p,
      limit: l,
      count: data.length, 
      platform: (platform || 'ALL').toUpperCase(),
      data
    });
  } catch (err) {
    console.error("[API ERROR /api/problems]", err);
    return res.status(500).json({ 
      success: false,
      error: "Internal Server Error", 
      message: err.message,
      data: [],
      count: 0
    });
  }
};

// ─── GET /api/problems/:id ────────────────────────────────────────────────────
// Supports both old numeric IDs (LC-1 → 1) and new string IDs (CF-123A)
exports.getProblem = async (req, res) => {
  try {
    const idParam = req.params.id;
    let problem;
    
    // Try finding by exact ID first (new string format)
    problem = await Problem.findOne({ $or: [{ uniqueId: idParam }, { id: idParam }], isDeleted: { $ne: true } });
    
    // Fallback: try parsing as number for old LeetCode IDs
    if (!problem) {
      const numericId = parseInt(idParam, 10);
      if (!isNaN(numericId)) {
        problem = await Problem.findOne({ $or: [{ uniqueId: `LC-${numericId}` }, { id: `LC-${numericId}` }], isDeleted: { $ne: true } });
      }
    }
    
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    
    const data = problem.toObject();
    if (!data.providerTitle) data.providerTitle = data.platform === 'CF' ? 'Codeforces' : 'LeetCode';
    if (!data.leetcodeLink && data.platformLink) data.leetcodeLink = data.platformLink;
    
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch problem', message: err.message });
  }
};

// ─── POST /api/problems ───────────────────────────────────────────────────────
// Supports multi-platform: platform='LC'|'CF', id='LC-1'|'CF-123A'
exports.createProblem = async (req, res) => {
  try {
    const { id, title, difficulty, topics, solved, notes, leetcodeLink, platformLink, 
            solvedDate, targeted, targetedAt, platform = 'LC' } = req.body;
    
    // Support both new platformLink and legacy leetcodeLink
    const link = platformLink || leetcodeLink;
    if (!id || !title || !difficulty || !link) {
      return res.status(400).json({ success: false, error: 'id, title, difficulty, and platformLink (or leetcodeLink) are required' });
    }
    
    // Format ID based on platform (e.g., 'LC-1' or 'CF-123A')
    const formattedId = id.toString().toUpperCase().startsWith(platform.toUpperCase())
      ? id.toString()
      : `${platform.toUpperCase()}-${id}`;
    const uniqueId = formattedId;
    
    // Check including soft-deleted — if deleted, block re-creation (user intent lock)
    const exists = await Problem.findOne({ uniqueId });
    if (exists && exists.isDeleted) {
      return res.status(409).json({ success: false, error: `Problem ${formattedId} was previously deleted. Deletion is permanent.` });
    }
    if (exists) return res.status(400).json({ success: false, error: `Problem ${formattedId} already exists` });

    const isSolved = solved === true || solved === 'true';
    const isTargeted = targeted === true || targeted === 'true';
    const now = new Date();
    const resolvedSolvedDate = isSolved ? (solvedDate ? new Date(solvedDate) : now) : null;
    const resolvedTargetedAt = isTargeted ? (targetedAt ? new Date(targetedAt) : now) : null;

    // Calculate normalized difficulty rating
    const rawDiff = req.body.rawDifficulty || difficulty;
    let difficultyRating = req.body.difficultyRating;
    if (!difficultyRating && typeof rawDiff === 'number') {
      difficultyRating = Math.ceil(rawDiff / 400);
      difficultyRating = Math.min(difficultyRating, 5);
    }

    // nextRevisionAt = solvedDate + 1 day (first revision due after 1 day)
    let nextRevisionAt = null;
    if (isSolved) {
      nextRevisionAt = new Date(resolvedSolvedDate);
      nextRevisionAt.setUTCDate(nextRevisionAt.getUTCDate() + 1);
    }

    // Extract numeric ID for sorting
    const numericExtract = id.toString().match(/(\d+)/);
    const problemIdNum = numericExtract ? parseInt(numericExtract[0], 10) : null;

    const problem = await Problem.create({
      uniqueId,
      id: uniqueId,
      problemIdNum,
      platform: platform.toUpperCase(),
      title,
      difficulty,
      rawDifficulty: rawDiff,
      difficultyRating,
      topics: Array.isArray(topics) ? topics : [],
      solved: isSolved,
      notes: notes || '',
      platformLink: link,
      leetcodeLink: link, // legacy compatibility
      solvedDate: resolvedSolvedDate,
      submittedAt: isSolved ? now : null,
      lastSubmittedAt: isSolved ? resolvedSolvedDate : null,
      nextRevisionAt,
      targeted: isTargeted,
      targetedAt: resolvedTargetedAt,
      providerTitle: req.body.providerTitle || (platform === 'CF' ? 'Codeforces' : 'LeetCode'),
      // Revision Intelligence Engine
      solveTime: req.body.solveTime != null ? parseInt(req.body.solveTime) : null,
      hintsUsed: req.body.hintsUsed === true || req.body.hintsUsed === 'true',
      wrongAttempts: req.body.wrongAttempts != null ? parseInt(req.body.wrongAttempts) : 0,
      mistakeType: req.body.mistakeType || null,
      needsRevision: req.body.needsRevision === true || req.body.needsRevision === 'true',
      confidence: req.body.needsRevision ? 1 : 3,
    });

    let streakData = null;
    if (isSolved) {
      const updated = await applyStreakUpdate();
      streakData = streakPayload(updated);
    }
    res.status(201).json({ success: true, data: problem, streak: streakData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create problem', message: err.message });
  }
};

// ─── PUT /api/problems/:id ────────────────────────────────────────────────────
// Supports both old numeric IDs and new string IDs (LC-1, CF-123A)
exports.updateProblem = async (req, res) => {
  try {
    const idParam = req.params.id;
    const updates = { ...req.body };
    delete updates.id;
    if (updates.solved !== undefined) updates.solved = updates.solved === true || updates.solved === 'true';
    if (updates.solved === true && !updates.solvedDate) updates.solvedDate = new Date();
    if (updates.solved === true) {
      updates.submittedAt = new Date();
      updates.lastSubmittedAt = updates.solvedDate || new Date();
    }
    if (updates.solved === false) { updates.solvedDate = null; updates.submittedAt = null; updates.lastSubmittedAt = null; }

    // Handle platformLink / leetcodeLink sync
    if (updates.platformLink && !updates.leetcodeLink) updates.leetcodeLink = updates.platformLink;
    if (updates.leetcodeLink && !updates.platformLink) updates.platformLink = updates.leetcodeLink;

    // Find problem by ID (try string first, then numeric fallback)
    let before = await Problem.findOne({ $or: [{ uniqueId: idParam }, { id: idParam }] });
    if (!before) {
      const numericId = parseInt(idParam, 10);
      if (!isNaN(numericId)) {
        before = await Problem.findOne({ $or: [{ uniqueId: `LC-${numericId}` }, { id: `LC-${numericId}` }] });
      }
    }
    
    if (!before) return res.status(404).json({ success: false, error: 'Problem not found' });
    if (before.isDeleted) return res.status(410).json({ success: false, error: 'Problem was deleted and cannot be modified' });

    const searchUniqueId = before.uniqueId || before.id; // stable key

    const problem = await Problem.findOneAndUpdate(
      { uniqueId: searchUniqueId }, updates, { returnDocument: 'after', runValidators: true }
    );

    let streakData = null;
    const isNewlySolved = updates.solved === true && before.solved === false;
    if (isNewlySolved) {
      const updated = await applyStreakUpdate();
      streakData = streakPayload(updated);
    }
    res.json({ success: true, data: problem, streak: streakData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update problem', message: err.message });
  }
};

// Helper: Find problem by ID (supports both string and numeric)
async function findProblemById(idParam) {
  let problem = await Problem.findOne({ $or: [{ uniqueId: idParam }, { id: idParam }] });
  if (!problem) {
    const numericId = parseInt(idParam, 10);
    if (!isNaN(numericId)) {
      problem = await Problem.findOne({ $or: [{ uniqueId: `LC-${numericId}` }, { id: `LC-${numericId}` }] });
    }
  }
  return problem;
}

// ─── POST /api/problems/:id/revise ───────────────────────────────────────────
exports.reviseProblem = async (req, res) => {
  try {
    const current = await findProblemById(req.params.id);
    if (!current) return res.status(404).json({ success: false, error: 'Problem not found' });

    const newCount = (current.revisionCount || 0) + 1;
    const timeTaken = req.body.timeTaken != null ? parseFloat(req.body.timeTaken) : null;
    const hintsUsed = req.body.hintsUsed === true || req.body.hintsUsed === 'true';
    const success   = req.body.success === true || req.body.success === 'true';

    // ── Confidence evaluation ──────────────────────────────────────────────
    let confidence;
    if (success && !hintsUsed) {
      if (timeTaken != null && timeTaken <= 12)      confidence = 5; // HIGH
      else if (timeTaken != null && timeTaken <= 15) confidence = 3; // MEDIUM
      else                                           confidence = 1; // LOW
    } else {
      confidence = 1; // LOW — failed or used hints
    }

    // ── Consecutive success tracking ──────────────────────────────────────
    const prevConsecutive = current.consecutiveSuccess || 0;
    const consecutiveSuccess = success ? prevConsecutive + 1 : 0;

    // ── Removal check: HIGH + 2 consecutive successes + time <= 12 ────────
    const shouldRemove = confidence === 5 && consecutiveSuccess >= 2 && timeTaken != null && timeTaken <= 12;

    // ── Spaced repetition — fixed intervals per spec ──────────────────────
    // revisionCount after this revision: 1→+3d, 2→+7d, 3+→+15d; failure→+1d
    let intervalDays;
    if (!success) {
      intervalDays = 1; // reset on failure
    } else {
      const intervals = [3, 7, 15]; // index = newCount-1, capped at last
      intervalDays = intervals[Math.min(newCount - 1, intervals.length - 1)];
    }
    const nextRevisionAt = new Date();
    nextRevisionAt.setUTCDate(nextRevisionAt.getUTCDate() + intervalDays);

    // ── Failure loop detection ─────────────────────────────────────────────
    const failureLoopFlagged = newCount >= 3 && confidence === 1;

    const updates = {
      revisionCount: newCount,
      lastRevisedAt: new Date(),
      confidence,
      nextRevisionAt: shouldRemove ? null : nextRevisionAt,
      needsRevision: !shouldRemove,
      lastRevisionSuccess: success,
      lastRevisionTime: timeTaken,
      consecutiveSuccess,
      failureLoopFlagged,
    };

    const problem = await Problem.findOneAndUpdate(
      { id: current.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json({
      success: true,
      removed: shouldRemove,
      data: {
        id: problem.id,
        revisionCount: problem.revisionCount,
        lastRevisedAt: problem.lastRevisedAt,
        confidence: problem.confidence,
        nextRevisionAt: problem.nextRevisionAt,
        needsRevision: problem.needsRevision,
        consecutiveSuccess: problem.consecutiveSuccess,
        failureLoopFlagged: problem.failureLoopFlagged,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record revision', message: err.message });
  }
};

// ─── POST /api/problems/:id/unrevise ─────────────────────────────────────────
exports.unreviseProblem = async (req, res) => {
  try {
    const current = await findProblemById(req.params.id);
    if (!current) return res.status(404).json({ success: false, error: 'Problem not found' });
    if ((current.revisionCount || 0) === 0) {
      return res.status(400).json({ success: false, error: 'revisionCount is already 0' });
    }
    const newCount = current.revisionCount - 1;
    const problem = await Problem.findOneAndUpdate(
      { id: current.id },
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
    const existing = await findProblemById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Problem not found' });
    
    const problem = await Problem.findOneAndUpdate(
      { id: existing.id },
      { $set: { targeted: true, targetedAt: new Date() } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: { id: problem.id, targeted: problem.targeted, targetedAt: problem.targetedAt } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to target problem', message: err.message });
  }
};

// ─── POST /api/problems/:id/untarget ─────────────────────────────────────────
exports.untargetProblem = async (req, res) => {
  try {
    const existing = await findProblemById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Problem not found' });
    
    const problem = await Problem.findOneAndUpdate(
      { id: existing.id },
      { $set: { targeted: false, targetedAt: null } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: { id: problem.id, targeted: problem.targeted, targetedAt: problem.targetedAt } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to untarget problem', message: err.message });
  }
};

// ─── DELETE /api/problems/:id ─────────────────────────────────────────────────
// SOFT DELETE — marks isDeleted=true, never removes document.
// Also soft-deletes related Submission by slug match.
// Rebuilds streak from remaining non-deleted solved problems.
exports.deleteProblem = async (req, res) => {
  try {
    const problem = await findProblemById(req.params.id);
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });
    if (problem.isDeleted) return res.status(410).json({ success: false, error: 'Problem already deleted' });

    const now = new Date();

    // Soft-delete the Problem document
    await Problem.findOneAndUpdate(
      { id: problem.id },
      { $set: { isDeleted: true, deletedAt: now } }
    );

    // Soft-delete any matching Submission (by leetcodeLink slug or title match)
    // Extract slug from leetcodeLink if available
    const slugMatch = problem.leetcodeLink?.match(/problems\/([^/]+)/);
    if (slugMatch) {
      await Submission.updateMany(
        { slug: slugMatch[1].toLowerCase() },
        { $set: { isDeleted: true } }
      );
    }

    // Rebuild streak from remaining non-deleted solved problems (backend = single source of truth)
    let streakData = null;
    if (problem.solved) {
      streakData = streakPayload(await rebuildStreak());
    }

    res.json({ success: true, data: { id: problem.id, title: problem.title }, streak: streakData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete problem', message: err.message });
  }
};

// ─── GET /api/problems/revision-list ─────────────────────────────────────────
// Only problems where nextRevisionAt <= now (due for revision)
exports.getRevisionList = async (req, res) => {
  try {
    const now = new Date();
    const problems = await Problem.find({ solved: true, isDeleted: { $ne: true } });
    const list = problems.filter(p => {
      if (!p.nextRevisionAt) return false;
      return now >= new Date(p.nextRevisionAt);
    });
    res.json({ success: true, count: (list || []).length, data: list || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch revision list', message: err.message });
  }
};

// ─── GET /api/problems/suggestions ───────────────────────────────────────────
// 70% weak topics, 20% revision backlog, 10% random
exports.getSuggestions = async (req, res) => {
  try {
    const now = new Date();
    const problems = await Problem.find({ solved: true, isDeleted: { $ne: true } });

    // Compute topic weakness scores
    const topicStats = {};
    problems.forEach(p => {
      (p.topics || []).forEach(t => {
        if (!topicStats[t]) topicStats[t] = { count: 0, totalConf: 0, lastSolved: null };
        topicStats[t].count++;
        topicStats[t].totalConf += (p.confidence || 3);
        if (!topicStats[t].lastSolved || (p.solvedDate && p.solvedDate > topicStats[t].lastSolved))
          topicStats[t].lastSolved = p.solvedDate;
      });
    });

    const weakTopics = Object.entries(topicStats)
      .map(([t, s]) => {
        const avgConf = s.count > 0 ? s.totalConf / s.count : 3;
        const daysSince = s.lastSolved ? Math.ceil((now - new Date(s.lastSolved)) / 86400000) : 999;
        const score = (5 - avgConf) * 2 + (daysSince > 7 ? 1 : 0) + (1 / Math.max(1, s.count)) * 0.6;
        return { topic: t, score, avgConf, daysSince };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(w => w.topic);

    // Revision backlog
    const revisionBacklog = problems.filter(p =>
      (p.revisionCount || 0) === 0 ||
      (p.nextRevisionAt && now > p.nextRevisionAt) ||
      ((p.revisionCount || 0) > 0 && (p.confidence ?? 3) <= 2)
    );

    const suggestions = [];
    const used = new Set();

    const addSuggestion = (p, reason) => {
      if (!p || used.has(p.id)) return;
      used.add(p.id);
      suggestions.push({
        problemId: p.id,
        title: p.title,
        difficulty: p.difficulty,
        topic: (p.topics || [])[0] || 'General',
        reason,
      });
    };

    // 70% weak topics (up to 7)
    for (const topic of weakTopics) {
      const candidates = problems.filter(p => (p.topics || []).includes(topic) && !used.has(p.id));
      if (candidates.length > 0) {
        const pick = candidates.sort((a, b) => (a.confidence || 3) - (b.confidence || 3))[0];
        addSuggestion(pick, `Weak in ${topic}`);
      }
    }

    // 20% revision backlog (up to 2)
    const backlogSorted = revisionBacklog
      .filter(p => !used.has(p.id))
      .sort((a, b) => (a.confidence || 3) - (b.confidence || 3));
    for (let i = 0; i < Math.min(2, backlogSorted.length); i++) {
      const p = backlogSorted[i];
      const reason = (p.revisionCount || 0) === 0 ? 'Never revised' :
        p.nextRevisionAt && now > p.nextRevisionAt ? `Overdue revision` : 'Low confidence';
      addSuggestion(p, reason);
    }

    // 10% random (1 problem)
    const remaining = problems.filter(p => !used.has(p.id));
    if (remaining.length > 0) {
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      addSuggestion(pick, 'Challenge yourself');
    }

    res.json({ success: true, count: (suggestions || []).length, data: suggestions || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch suggestions', message: err.message });
  }
};

// ─── GET /api/problems/stats ──────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const problems = await Problem.find({ isDeleted: { $ne: true } });
    const safeProblems = Array.isArray(problems) ? problems : [];
    const total = safeProblems.length;
    const solved = safeProblems.filter(p => p.solved).length;

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
      
      const probId = p.id ?? p.number;
      const numMatch = probId.toString().match(/(\d+)/);

      return {
        updateOne: {
          filter: { id: parseInt(probId) },
          update: {
            $set: {
              id: parseInt(probId),
              problemIdNum: numMatch ? parseInt(numMatch[0], 10) : null,
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

    res.json({ success: true, count: (ops || []).length, streak: streakPayload(s) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Align failed', message: err.message });
  }
};

// ─── PATCH /api/problems/:id/striver ─────────────────────────────────────────
exports.toggleStriver = async (req, res) => {
  try {
    const problem = await findProblemById(req.params.id);
    if (!problem || problem.isDeleted) return res.status(404).json({ success: false, error: 'Problem not found' });

    problem.isStriver = !problem.isStriver;
    await problem.save();

    res.json({ success: true, data: { id: problem.id, isStriver: problem.isStriver } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to toggle striver', message: err.message });
  }
};

// ─── POST /api/problems/mark-striver ─────────────────────────────────────────
// Bulk-marks problems as isStriver=true. Idempotent — safe to call multiple times.
// Accepts optional problemIds array in request body; falls back to hardcoded list.
const DEFAULT_STRIVER_IDS = [
  1, 2, 3, 5, 7, 8, 9, 11, 13, 14, 15, 18, 19, 20, 21, 22, 25, 26,
  31, 33, 34, 35, 37, 39, 40, 46, 48, 50, 51, 53, 54, 56, 61, 69, 70,
  73, 74, 75, 76, 78, 81, 84, 85, 88, 90, 118, 121,
  128, 131, 136, 137, 138, 141, 142, 148, 151, 152, 153, 155, 160, 162,
  169, 189, 204, 205, 206, 225, 231, 232, 234, 237, 238, 239, 240,
  242, 268, 287, 328, 402, 409, 410, 424, 451, 485, 496, 503, 509, 540,
  560, 704, 735, 739, 796, 875, 876, 901, 907, 930, 992, 1004,
  1011, 1021, 1248, 1283, 1423, 1482, 1539, 1614, 1752, 1781,
  1901, 2095, 2149, 2220,
];

exports.markStriverProblems = async (req, res) => {
  try {
    const problemIds = Array.isArray(req.body?.problemIds)
      ? req.body.problemIds.map(Number)
      : DEFAULT_STRIVER_IDS;

    // Bulk update — only touches isStriver, never creates new docs
    const result = await Problem.updateMany(
      { id: { $in: problemIds } },
      { $set: { isStriver: true } }
    );

    // Find which IDs don't exist in DB
    const existing = await Problem.find({ id: { $in: problemIds } }, { id: 1, _id: 0 });
    const existingIds = new Set(existing.map(p => p.id));
    const missingIds = problemIds.filter(id => !existingIds.has(id));

    console.log(`[mark-striver] matched=${result.matchedCount} modified=${result.modifiedCount} missing=${missingIds.length}`);

    res.json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      missingIds,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark striver problems', message: err.message });
  }
};

// ─── GET /api/problems/striver-stats ─────────────────────────────────────────
exports.getStriverStats = async (req, res) => {
  try {
    const problems = await Problem.find({ isStriver: true, solved: true, isDeleted: { $ne: true } });
    const safeProblems = Array.isArray(problems) ? problems : [];
    const easy   = safeProblems.filter(p => p.difficulty === 'Easy').length;
    const medium = safeProblems.filter(p => p.difficulty === 'Medium').length;
    const hard   = safeProblems.filter(p => p.difficulty === 'Hard').length;
    res.json({ success: true, data: { easy, medium, hard, total: safeProblems.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch striver stats', message: err.message });
  }
};

// ─── POST /api/problems/streak/reset ─────────────────────────────────────────
// Rebuilds streak from DB — always deterministic
exports.resetStreakAuto = async (req, res) => {
  try {
    const rebuilt = await rebuildStreak();
    res.json({ success: true, data: streakPayload(rebuilt) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Export rebuildStreak for use by other controllers ────────────────────────
exports.rebuildStreak = rebuildStreak;

// ─── GET /api/problems/streak/validate ───────────────────────────────────────
// Validates streak correctness and lists all gap days explicitly.
exports.validateStreak = async (req, res) => {
  try {
    const [problems, settings] = await Promise.all([
      Problem.find(
        { solved: true, isDeleted: { $ne: true }, solvedDate: { $ne: null } },
        { solvedDate: 1 }
      ).lean(),
      Settings.findOne({ key: 'global' }).lean(),
    ]);

    const calendarDates = settings?.submissionCalendarDates?.length > 0
      ? settings.submissionCalendarDates
      : null;

    const stats = computeStats(problems, calendarDates);

    // Compare with stored values
    const stored = await Settings.findOne({ key: 'global' });
    const storedMax     = stored?.maxStreak     ?? null;
    const storedCurrent = stored?.currentStreak ?? null;
    const storedActive  = stored?.activeDays    ?? null;

    const isCorrect = storedMax === stats.maxStreak &&
                      storedCurrent === stats.currentStreak &&
                      storedActive  === stats.activeDays;

    if (!isCorrect) {
      console.log(`[VALIDATE] Mismatch — stored(current=${storedCurrent} max=${storedMax} active=${storedActive}) computed(current=${stats.currentStreak} max=${stats.maxStreak} active=${stats.activeDays})`);
    } else {
      console.log('[VALIDATE] Streak logic is CORRECT');
    }

    res.json({
      success: true,
      isCorrect,
      computed: { currentStreak: stats.currentStreak, maxStreak: stats.maxStreak, activeDays: stats.activeDays },
      stored:   { currentStreak: storedCurrent, maxStreak: storedMax, activeDays: storedActive },
      days:         stats.days,
      gaps:         stats.gaps,
      totalGapDays: (stats?.gaps || []).length,
      todayKey:     stats.todayKey,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
