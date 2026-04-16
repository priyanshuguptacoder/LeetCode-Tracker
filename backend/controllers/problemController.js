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
// ─── computeStreakForPlatform — reusable per-platform streak helper ───────────
async function computeStreakForPlatform(platform = 'ALL', calendarDates = null) {
  const VALID_PLATFORMS = ['LC', 'CF'];
  if (platform !== 'ALL' && !VALID_PLATFORMS.includes(platform)) {
    throw new Error(`Invalid platform: ${platform}. Must be LC, CF, or ALL.`);
  }

  const filter = {
    solved: true,
    isDeleted: { $ne: true },
    $or: [{ solvedDate: { $ne: null } }, { lastSubmittedAt: { $ne: null } }],
  };
  if (platform !== 'ALL') filter.platform = platform;

  const rawProblems = await Problem.find(
    filter,
    { solvedDate: 1, lastSubmittedAt: 1, platform: 1, uniqueId: 1 }
  ).lean();

  // Data validation — skip corrupt docs, log them
  let skipped = 0;
  const problems = rawProblems
    .filter(p => {
      if (p.platform && !VALID_PLATFORMS.includes(p.platform)) {
        console.error(`[STREAK] Unknown platform "${p.platform}" on doc ${p.uniqueId} — skipping`);
        skipped++;
        return false;
      }
      if (!p.solvedDate && !p.lastSubmittedAt) {
        console.error(`[STREAK] Doc ${p.uniqueId} has no solvedDate or lastSubmittedAt — skipping`);
        skipped++;
        return false;
      }
      return true;
    })
    .map(p => {
      // For CF: always prefer lastSubmittedAt (most accurate submission timestamp).
      // For LC/ALL: use solvedDate first, fall back to lastSubmittedAt.
      const dateToUse = (platform === 'CF')
        ? (p.lastSubmittedAt || p.solvedDate)
        : (p.solvedDate || p.lastSubmittedAt);
      return { ...p, solvedDate: dateToUse };
    });

  console.log(`[STREAK] platform=${platform} total=${rawProblems.length} valid=${problems.length} skipped=${skipped}`);

  // Only use calendar dates for global/LC (calendar is LC-specific, not CF)
  const effectiveCal = (platform === 'ALL' || platform === 'LC') ? calendarDates : null;
  return computeStats(problems, effectiveCal);
}

// ─── GET /api/problems/streak ─────────────────────────────────────────────────
exports.getStreak = async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'global' }, { submissionCalendarDates: 1 }).lean();
    const calendarDates = settings?.submissionCalendarDates?.length > 0
      ? settings.submissionCalendarDates
      : null;

    const [global, lc, cf] = await Promise.all([
      computeStreakForPlatform('ALL', calendarDates),
      computeStreakForPlatform('LC',  calendarDates),
      computeStreakForPlatform('CF',  null),
    ]);

    if (!global.isValid) {
      return res.status(500).json({ success: false, error: 'Stats invariant violation', errors: global.errors });
    }

    // Consistency check — global streak must be >= each platform streak
    // (global uses calendar which may include days not in problem solvedDates)
    if (global.currentStreak < lc.currentStreak) {
      console.warn(`[STREAK] Inconsistency: global(${global.currentStreak}) < lc(${lc.currentStreak})`);
    }
    if (global.currentStreak < cf.currentStreak) {
      console.warn(`[STREAK] Inconsistency: global(${global.currentStreak}) < cf(${cf.currentStreak})`);
    }

    // Primary response shape (backward-compatible: top-level = global)
    res.json({
      success: true,
      data: {
        ...streakPayload(global),   // currentStreak, maxStreak, activeDays (global)
        global: streakPayload(global),
        lc:     streakPayload(lc),
        cf:     streakPayload(cf),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch streak', message: err.message });
  }
};

// ─── GET /api/problems ────────────────────────────────────────────────────────
// Query params: ?platform=LC | ?platform=CF | ?platform=ALL (default: ALL)
exports.getAllProblems = async (req, res) => {
  const { platform = 'ALL', page, limit } = req.query;

  try {
    const p = page ? parseInt(page, 10) || 1 : 1;
    const l = page ? (parseInt(limit, 10) || 50) : 0;

    const platformFilter = platform !== 'ALL' ? { platform: platform.toUpperCase() } : {};

    // ─── STRICT NUMERIC SORT — data must be clean before reaching here ────────
    // Startup backfill ensures problemIdNum / contestId are always set.
    let sortStage;
    const plat = platform.toUpperCase();
    if (plat === 'LC') {
      sortStage = { problemIdNum: 1 };
    } else if (plat === 'CF') {
      sortStage = { contestId: 1, index: 1 };
    } else {
      // ALL: group by platform first, then numeric within each
      sortStage = { platform: 1, problemIdNum: 1, contestId: 1, index: 1 };
    }

    let query = Problem.find(platformFilter).sort(sortStage).lean();
    if (l > 0) query = query.skip((p - 1) * l).limit(l);

    const [rawProblems, rawTotal] = await Promise.all([
      query,
      Problem.countDocuments(platformFilter),
    ]);

    const problems = Array.isArray(rawProblems) ? rawProblems : [];
    const total = typeof rawTotal === 'number' ? rawTotal : 0;

    const data = problems.map(p => {
      if (!p.providerTitle) p.providerTitle = p.platform === 'CF' ? 'Codeforces' : 'LeetCode';
      if (!p.leetcodeLink && p.platformLink) p.leetcodeLink = p.platformLink;
      return p;
    });

    return res.json({
      success: true,
      total,
      page: p,
      limit: l,
      count: data.length,
      platform: (platform || 'ALL').toUpperCase(),
      data,
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

function normalizePlatform(platform) {
  const raw = String(platform || '').trim();
  if (raw === 'LeetCode') return 'LC';
  if (raw === 'Codeforces') return 'CF';
  const upper = raw.toUpperCase();
  return upper === 'CF' ? 'CF' : 'LC';
}

function normalizeUniqueId(idParam) {
  const raw = String(idParam || '').trim();
  if (!raw) return '';
  if (/^(LC|CF)-/i.test(raw)) return raw.toUpperCase();
  if (/^\d+$/.test(raw)) return `LC-${raw}`;
  return raw.toUpperCase();
}

async function findProblemByUniqueId(idParam) {
  const uniqueId = normalizeUniqueId(idParam);
  if (!uniqueId) return null;
  return Problem.findOne({ uniqueId, isDeleted: { $ne: true } });
}

// ─── GET /api/problems/:id ────────────────────────────────────────────────────
// Canonical lookup: uniqueId only (examples: LC-1, CF-1772A)
exports.getProblem = async (req, res) => {
  try {
    const problem = await findProblemByUniqueId(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });
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
    const normalizedPlatform = normalizePlatform(platform);
    
    // Support both new platformLink and legacy leetcodeLink
    const link = platformLink || leetcodeLink;
    if (!id || !title || !difficulty || !link) {
      return res.status(400).json({ success: false, error: 'id, title, difficulty, and platformLink (or leetcodeLink) are required' });
    }
    
    // Format ID based on platform (e.g., 'LC-1' or 'CF-123A')
    const formattedId = id.toString().toUpperCase().startsWith(`${normalizedPlatform}-`)
      ? id.toString().toUpperCase()
      : `${normalizedPlatform}-${id}`;
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
      platform: normalizedPlatform,
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
      providerTitle: req.body.providerTitle || (normalizedPlatform === 'CF' ? 'Codeforces' : 'LeetCode'),
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
// Canonical lookup: uniqueId only
exports.updateProblem = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates._id;
    delete updates.uniqueId;
    if (updates.platform !== undefined) updates.platform = normalizePlatform(updates.platform);
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

    const before = await findProblemByUniqueId(req.params.id);
    if (!before) return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });

    const problem = await Problem.findOneAndUpdate(
      { uniqueId: before.uniqueId, isDeleted: { $ne: true } }, updates, { new: true, runValidators: true }
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

// ─── POST /api/problems/:id/revise ───────────────────────────────────────────
exports.reviseProblem = async (req, res) => {
  try {
    const current = await findProblemByUniqueId(req.params.id);
    if (!current) return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });

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
      { uniqueId: current.uniqueId, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json({
      success: true,
      removed: shouldRemove,
      data: {
        uniqueId: problem.uniqueId,
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
    const current = await findProblemByUniqueId(req.params.id);
    if (!current) return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });
    if ((current.revisionCount || 0) === 0) {
      return res.status(400).json({ success: false, error: 'revisionCount is already 0' });
    }
    const newCount = current.revisionCount - 1;
    const problem = await Problem.findOneAndUpdate(
      { uniqueId: current.uniqueId, isDeleted: { $ne: true } },
      { $set: { revisionCount: newCount, lastRevisedAt: newCount === 0 ? null : current.lastRevisedAt } },
      { new: true, runValidators: true }
    );
    res.json({
      success: true,
      data: { uniqueId: problem.uniqueId, revisionCount: problem.revisionCount, lastRevisedAt: problem.lastRevisedAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to unrevise', message: err.message });
  }
};

// ─── POST /api/problems/:id/target ───────────────────────────────────────────
exports.targetProblem = async (req, res) => {
  try {
    const existing = await findProblemByUniqueId(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });
    
    const problem = await Problem.findOneAndUpdate(
      { uniqueId: existing.uniqueId, isDeleted: { $ne: true } },
      { $set: { targeted: true, targetedAt: new Date() } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: problem });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to target problem', message: err.message });
  }
};

// ─── POST /api/problems/:id/untarget ─────────────────────────────────────────
exports.untargetProblem = async (req, res) => {
  try {
    const existing = await findProblemByUniqueId(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });
    
    const problem = await Problem.findOneAndUpdate(
      { uniqueId: existing.uniqueId, isDeleted: { $ne: true } },
      { $set: { targeted: false, targetedAt: null } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: problem });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to untarget problem', message: err.message });
  }
};

// ─── PATCH /api/problems/:id/target — unified toggle ─────────────────────────
exports.toggleTarget = async (req, res) => {
  try {
    const existing = await findProblemByUniqueId(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });
    }
    const newVal = !existing.targeted;
    const updated = await Problem.findOneAndUpdate(
      { uniqueId: existing.uniqueId, isDeleted: { $ne: true } },
      { $set: { targeted: newVal, targetedAt: newVal ? new Date() : null } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to toggle target', message: err.message });
  }
};

// ─── DELETE /api/problems/:id ─────────────────────────────────────────────────
// SOFT DELETE — marks isDeleted=true, never removes document.
// Also soft-deletes related Submission by slug match.
// Rebuilds streak from remaining non-deleted solved problems.
exports.deleteProblem = async (req, res) => {
  try {
    const problem = await findProblemByUniqueId(req.params.id);
    if (!problem) return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });

    const now = new Date();

    // Soft-delete the Problem document
    await Problem.findOneAndUpdate(
      { uniqueId: problem.uniqueId, isDeleted: { $ne: true } },
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

    res.json({ success: true, data: { uniqueId: problem.uniqueId, title: problem.title }, streak: streakData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete problem', message: err.message });
  }
};

// ─── GET /api/problems/revision-list ─────────────────────────────────────────
// Returns up to 9 due-for-revision problems: 6 LC + 3 CF (balanced).
// Sorted by oldest revision first (most urgent). Edge-case fill from other platform.
exports.getRevisionList = async (req, res) => {
  try {
    const now = new Date();

    const all = await Problem.find({
      solved: true,
      isDeleted: { $ne: true },
      needsRevision: true,
      $or: [
        { nextRevisionAt: { $lte: now } },
        { nextRevisionAt: null },
      ],
    })
      .sort({ lastRevisedAt: 1, solvedDate: 1 })
      .lean();

    const lc = all.filter(p => p.platform === 'LC');
    const cf = all.filter(p => p.platform === 'CF');

    let lcSelected = lc.slice(0, 6);
    let cfSelected = cf.slice(0, 3);

    // Fill gaps from the other platform
    if (lcSelected.length < 6) {
      cfSelected = cf.slice(0, Math.min(cf.length, 9 - lcSelected.length));
    }
    if (cfSelected.length < 3) {
      lcSelected = lc.slice(0, Math.min(lc.length, 9 - cfSelected.length));
    }

    const result = [...lcSelected, ...cfSelected].slice(0, 9);

    res.json({ success: true, count: result.length, data: result });
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
      if (!p || used.has(p.uniqueId)) return;
      used.add(p.uniqueId);
      suggestions.push({
        problemId: p.uniqueId,
        title: p.title,
        difficulty: p.difficulty,
        topic: (p.topics || [])[0] || 'General',
        reason,
      });
    };

    // 70% weak topics (up to 7)
    for (const topic of weakTopics) {
      const candidates = problems.filter(p => (p.topics || []).includes(topic) && !used.has(p.uniqueId));
      if (candidates.length > 0) {
        const pick = candidates.sort((a, b) => (a.confidence || 3) - (b.confidence || 3))[0];
        addSuggestion(pick, `Weak in ${topic}`);
      }
    }

    // 20% revision backlog (up to 2)
    const backlogSorted = revisionBacklog
      .filter(p => !used.has(p.uniqueId))
      .sort((a, b) => (a.confidence || 3) - (b.confidence || 3));
    for (let i = 0; i < Math.min(2, backlogSorted.length); i++) {
      const p = backlogSorted[i];
      const reason = (p.revisionCount || 0) === 0 ? 'Never revised' :
        p.nextRevisionAt && now > p.nextRevisionAt ? `Overdue revision` : 'Low confidence';
      addSuggestion(p, reason);
    }

    // 10% random (1 problem)
    const remaining = problems.filter(p => !used.has(p.uniqueId));
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
      
      const platform = normalizePlatform(p.platform);
      const rawId = p.uniqueId || p.number;
      const uniqueId = normalizeUniqueId(
        String(rawId || '').startsWith(`${platform}-`) ? rawId : `${platform}-${rawId}`
      );
      const numMatch = uniqueId.match(/(\d+)/);

      return {
        updateOne: {
          filter: { uniqueId },
          update: {
            $set: {
              uniqueId,
              id: uniqueId,
              platform,
              problemIdNum: numMatch ? parseInt(numMatch[0], 10) : null,
              title: p.title,
              difficulty: p.difficulty || 'Medium',
              topics: Array.isArray(p.topics) ? p.topics : [],
              solved: isSolved,
              notes: p.notes || '',
              platformLink: p.platformLink || p.leetcodeLink || p.link || '',
              leetcodeLink: p.leetcodeLink || p.platformLink || p.link || '',
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

// ─── PATCH /api/problems/:id/striver — LC only ───────────────────────────────
exports.toggleStriver = async (req, res) => {
  try {
    const existing = await findProblemByUniqueId(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });
    }
    if (existing.platform !== 'LC') {
      return res.status(400).json({ success: false, error: 'Striver is only available for LeetCode problems' });
    }
    const updated = await Problem.findOneAndUpdate(
      { uniqueId: existing.uniqueId, isDeleted: { $ne: true } },
      { $set: { isStriver: !existing.isStriver } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to toggle striver', message: err.message });
  }
};

// ─── PATCH /api/problems/:id/tle — CF only ───────────────────────────────────
exports.toggleTLE = async (req, res) => {
  try {
    const existing = await findProblemByUniqueId(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Problem not found for uniqueId ${normalizeUniqueId(req.params.id)}` });
    }
    if (existing.platform !== 'CF') {
      return res.status(400).json({ success: false, error: 'TLE sheet is only available for Codeforces problems' });
    }
    const updated = await Problem.findOneAndUpdate(
      { uniqueId: existing.uniqueId, isDeleted: { $ne: true } },
      { $set: { isTLE: !existing.isTLE } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to toggle TLE', message: err.message });
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
      ? req.body.problemIds.map(n => `LC-${Number(n)}`)
      : DEFAULT_STRIVER_IDS;
    const uniqueIds = problemIds.map(id => typeof id === 'string' && id.startsWith('LC-') ? id : `LC-${id}`);

    // Bulk update — only touches isStriver, never creates new docs
    const result = await Problem.updateMany(
      { uniqueId: { $in: uniqueIds } },
      { $set: { isStriver: true } }
    );

    // Find which IDs don't exist in DB
    const existing = await Problem.find({ uniqueId: { $in: uniqueIds } }, { uniqueId: 1, _id: 0 });
    const existingIds = new Set(existing.map(p => p.uniqueId));
    const missingIds = uniqueIds.filter(id => !existingIds.has(id));

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

// ─── GET /api/problems/tle-stats ──────────────────────────────────────────────
exports.getTLEStats = async (req, res) => {
  try {
    const all  = await Problem.find({ isTLE: true, isDeleted: { $ne: true } }).lean();
    const solved = all.filter(p => p.solved);
    const easy   = solved.filter(p => p.difficulty === 'Easy').length;
    const medium = solved.filter(p => p.difficulty === 'Medium').length;
    const hard   = solved.filter(p => p.difficulty === 'Hard').length;
    res.json({
      success: true,
      data: { easy, medium, hard, total: solved.length, totalInSheet: all.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch TLE stats', message: err.message });
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
