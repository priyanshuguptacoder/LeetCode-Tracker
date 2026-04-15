require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Problem = require('../models/Problem');

async function migrate() {
  console.log('🚀 Starting Data Consistency Migration & Cleanup...');
  
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is missing');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. DUPLICATE CLEANUP (Keep oldest/solved duplicate based on id)
    console.log('\n🧹 Phase 1: Cleaning up duplicate IDs...');
    const problems = await Problem.find({});
    const idMap = new Map();
    let removedCount = 0;

    for (const p of problems) {
      if (!idMap.has(p.id)) {
        idMap.set(p.id, p);
      } else {
        const existing = idMap.get(p.id);
        // If current is solved and existing is not, keep current
        if (p.solved && !existing.solved) {
          await Problem.deleteOne({ _id: existing._id });
          idMap.set(p.id, p);
          removedCount++;
        } else {
          // otherwise remove current duplicate
          await Problem.deleteOne({ _id: p._id });
          removedCount++;
        }
      }
    }
    console.log(`✅ Removed ${removedCount} duplicate documents`);

    // 2. ENFORCE UNIQUE INDEX ON 'id'
    console.log('\n🔒 Phase 2: Enforcing Unique Index...');
    const coll = mongoose.connection.collection('problems');
    try {
      await coll.createIndex({ id: 1 }, { unique: true });
      console.log('✅ Unique index on "id" enforced');
    } catch (err) {
      console.log('⚠️ Index might already exist or error:', err.message);
    }

    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
