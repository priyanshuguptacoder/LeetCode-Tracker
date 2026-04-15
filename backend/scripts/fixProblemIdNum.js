/**
 * One-time backfill: set problemIdNum on all LC problems that are missing it.
 * Run manually: node backend/scripts/fixProblemIdNum.js
 * Also called automatically from server.js startup (idempotent).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Problem  = require('../models/Problem');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[fixProblemIdNum] Connected to MongoDB');

  const missing = await Problem.find({
    platform: 'LC',
    $or: [{ problemIdNum: null }, { problemIdNum: { $exists: false } }, { problemIdNum: 0 }],
  }, { _id: 1, uniqueId: 1, id: 1 }).lean();

  if (missing.length === 0) {
    console.log('[fixProblemIdNum] All LC problems already have problemIdNum — nothing to do.');
    await mongoose.disconnect();
    return;
  }

  const ops = missing.map(doc => {
    const m = (doc.uniqueId || doc.id || '').match(/^LC-(\d+)$/);
    const num = m ? parseInt(m[1], 10) : null;
    if (!num) {
      console.warn('[fixProblemIdNum] Cannot extract ID from:', doc.uniqueId || doc.id);
      return null;
    }
    return {
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { problemIdNum: num } },
      },
    };
  }).filter(Boolean);

  if (ops.length > 0) {
    const result = await Problem.bulkWrite(ops);
    console.log(`[fixProblemIdNum] Fixed ${result.modifiedCount} / ${missing.length} LC problems`);
  }

  await mongoose.disconnect();
  console.log('[fixProblemIdNum] Done.');
}

run().catch(err => {
  console.error('[fixProblemIdNum] Error:', err.message);
  process.exit(1);
});
