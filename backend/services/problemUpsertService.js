const Problem = require('../models/Problem');

function coerceDate(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Unified solved-problem upsert.
 *
 * Rules:
 * - Never delete during sync (caller should not delete)
 * - Never overwrite solvedDate if it already exists
 * - Only update mutable fields if incoming lastSubmittedAt is newer
 * - If solved === true then solvedDate is guaranteed non-null (invariant)
 */
async function upsertSolvedProblem(incoming) {
  const {
    uniqueId,
    platform,
    title,
    difficulty,
    topics = [],
    platformLink,
    contestId = null,
    index = null,
    rating = null,
    problemIdNum = null,
    lastSubmittedAt,
    solvedDate,
  } = incoming || {};

  if (!uniqueId) throw new Error('uniqueId is required');
  if (!platform) throw new Error('platform is required');

  const incomingLast = coerceDate(lastSubmittedAt) || coerceDate(solvedDate) || new Date();
  const incomingSolvedDate = coerceDate(solvedDate) || incomingLast;

  const existing = await Problem.findOne({ uniqueId }).lean();

  // Respect user intent lock
  if (existing?.isDeleted) {
    return { action: 'skipped_deleted', uniqueId };
  }

  // If existing is solved and incoming is not newer, do nothing (idempotent)
  const existingLast = existing?.lastSubmittedAt ? new Date(existing.lastSubmittedAt) : null;
  if (existingLast && incomingLast <= existingLast) {
    // Repair: backfill solvedDate if missing even when skipping the update
    if (existing.solved && !existing.solvedDate) {
      const fallback = existing.lastSubmittedAt || incomingLast;
      await Problem.updateOne({ uniqueId }, { $set: { solvedDate: fallback } });
    }
    return { action: 'skipped_older', uniqueId };
  }

  const TLE_TOPICS = ['dp', 'graphs', 'greedy', 'binary search'];
  const cfRating = Number(rating || 0);
  const isTLE = platform === 'CF' && (
    (cfRating >= 1200 && cfRating <= 1800) ||
    (Array.isArray(topics) && topics.some(t => TLE_TOPICS.includes((t || '').toLowerCase())))
  );

  // Always derive problemIdNum from uniqueId for LC — never trust the caller
  const resolvedProblemIdNum = platform === 'LC'
    ? (() => { const m = uniqueId.match(/^LC-(\d+)$/); return m ? parseInt(m[1], 10) : (problemIdNum || null); })()
    : (problemIdNum || null);

  if (platform === 'LC' && !resolvedProblemIdNum) {
    console.error('[UPSERT] Cannot extract problemIdNum from LC uniqueId:', uniqueId);
    // Don't throw — still insert, but log so it shows in Render logs
  }

  const set = {
    uniqueId,
    id: uniqueId,
    platform,
    title,
    difficulty,
    topics,
    platformLink,
    leetcodeLink: platformLink,
    lastSubmittedAt: incomingLast,
    submittedAt: incomingLast,
    solved: true,
    contestId,
    index,
    rating,
    problemIdNum: resolvedProblemIdNum,
    isTLE,
    providerTitle: platform === 'CF' ? 'Codeforces' : 'LeetCode',
  };

  // Critical rule: never overwrite solvedDate if already present
  if (!existing?.solvedDate) {
    set.solvedDate = incomingSolvedDate;
  }

  // Revision init if new doc
  const setOnInsert = {
    createdAt: new Date(),
    revisionCount: 0,
    confidence: 3,
    isDeleted: false,
  };

  const doc = await Problem.findOneAndUpdate(
    { uniqueId },
    { $set: set, $setOnInsert: setOnInsert },
    { upsert: true, new: true }
  );

  return { action: existing ? 'updated' : 'inserted', uniqueId, doc };
}

module.exports = { upsertSolvedProblem };

