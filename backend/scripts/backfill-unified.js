require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Problem = require('../models/Problem');

function toDate(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function normalizeDifficulty(platform, rawDifficulty, difficulty) {
  if (platform === 'CF') {
    const r = rawDifficulty != null ? Number(rawDifficulty) : NaN;
    if (Number.isNaN(r)) return difficulty || 'Medium';
    if (r <= 1000) return 'Easy';
    if (r <= 1400) return 'Medium';
    return 'Hard';
  }
  // LC
  if (!difficulty) return 'Medium';
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
}

function computeUniqueId(p) {
  const platform = (p.platform || '').toString().toUpperCase() || (p.id?.toString().startsWith('CF-') ? 'CF' : 'LC');
  if (platform === 'CF') {
    const contestId = p.contestId != null ? Number(p.contestId) : null;
    const idx = (p.index || '').toString().trim().toUpperCase();
    if (contestId && idx) return `CF-${contestId}${idx}`;
    // Fallback: attempt to parse from legacy id
    const m = (p.id || '').toString().toUpperCase().match(/^CF-(\d+)-?([A-Z0-9]+)$/);
    if (m) return `CF-${Number(m[1])}${m[2]}`;
  } else {
    // LC
    let num = p.problemIdNum != null ? Number(p.problemIdNum) : null;
    if (!num || Number.isNaN(num)) {
      const m = (p.id || '').toString().match(/(\d+)/);
      num = m ? Number(m[1]) : null;
    }
    if (num) return `LC-${num}`;
  }
  return (p.uniqueId || p.id || '').toString();
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const stats = {
    scanned: 0,
    updated: 0,
    dedupDeleted: 0,
    fixedSolvedDate: 0,
    fixedNumeric: 0,
    errors: 0,
  };

  const problems = await Problem.find({}).lean();
  stats.scanned = problems.length;

  // Phase 1: normalize fields + set uniqueId/id
  for (const p of problems) {
    try {
      const platform = (p.platform || '').toString().toUpperCase() || (p.id?.toString().startsWith('CF-') ? 'CF' : 'LC');
      const uniqueId = computeUniqueId(p);

      const update = {};

      if (!p.uniqueId || p.uniqueId !== uniqueId) update.uniqueId = uniqueId;
      if (!p.id || p.id !== uniqueId) update.id = uniqueId;
      if (!p.platform || p.platform !== platform) update.platform = platform;

      // Numeric fields
      if (platform === 'CF') {
        const contestId = p.contestId != null ? Number(p.contestId) : null;
        const idx = (p.index || '').toString().trim().toUpperCase() || null;
        if (contestId != null && p.contestId !== contestId) { update.contestId = contestId; stats.fixedNumeric++; }
        if (idx && p.index !== idx) { update.index = idx; stats.fixedNumeric++; }
        if (p.rawDifficulty != null) {
          const rating = Number(p.rawDifficulty);
          if (!Number.isNaN(rating) && p.rating !== rating) { update.rating = rating; stats.fixedNumeric++; }
        }
      } else {
        const m = uniqueId.match(/^LC-(\d+)$/);
        const num = m ? Number(m[1]) : (p.problemIdNum != null ? Number(p.problemIdNum) : null);
        if (num && p.problemIdNum !== num) { update.problemIdNum = num; stats.fixedNumeric++; }
      }

      // Difficulty normalization
      const normalizedDiff = normalizeDifficulty(platform, p.rawDifficulty, p.difficulty);
      if (normalizedDiff && p.difficulty !== normalizedDiff) update.difficulty = normalizedDiff;

      // solvedDate invariant
      if (p.solved === true && !p.solvedDate) {
        const candidate = toDate(p.lastSubmittedAt) || toDate(p.submittedAt) || new Date();
        update.solvedDate = candidate;
        stats.fixedSolvedDate++;
      }

      if (Object.keys(update).length > 0) {
        await Problem.updateOne({ _id: p._id }, { $set: update });
        stats.updated++;
      }
    } catch (e) {
      stats.errors++;
      console.warn('Update failed for', p._id?.toString(), e.message);
    }
  }

  // Phase 2: dedupe by uniqueId (keep max lastSubmittedAt)
  const dupGroups = await Problem.aggregate([
    { $group: { _id: '$uniqueId', ids: { $push: '$_id' }, last: { $push: '$lastSubmittedAt' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const g of dupGroups) {
    try {
      const docs = await Problem.find({ _id: { $in: g.ids } }, { _id: 1, lastSubmittedAt: 1 }).lean();
      docs.sort((a, b) => {
        const ad = a.lastSubmittedAt ? new Date(a.lastSubmittedAt) : new Date(0);
        const bd = b.lastSubmittedAt ? new Date(b.lastSubmittedAt) : new Date(0);
        return bd - ad;
      });
      const keep = docs[0]?._id;
      const drop = docs.slice(1).map(d => d._id);
      if (drop.length > 0) {
        await Problem.deleteMany({ _id: { $in: drop } });
        stats.dedupDeleted += drop.length;
      }
      // ensure kept doc is not missing solvedDate if solved
      const kept = await Problem.findOne({ _id: keep }).lean();
      if (kept?.solved === true && !kept?.solvedDate) {
        await Problem.updateOne({ _id: keep }, { $set: { solvedDate: toDate(kept.lastSubmittedAt) || new Date() } });
        stats.fixedSolvedDate++;
      }
    } catch (e) {
      stats.errors++;
      console.warn('Dedupe failed for uniqueId', g._id, e.message);
    }
  }

  console.log('Backfill complete:', stats);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

