/**
 * Migration: Add Multi-Platform Support to Existing LeetCode Data
 * 
 * This script safely migrates existing Problem documents to the new schema:
 * - Converts numeric IDs to string format: 1 → "LC-1"
 * - Adds platform field (defaults to 'LC' for existing data)
 * - Sets providerTitle to 'LeetCode' for existing data
 * - Copies leetcodeLink → platformLink
 * - Adds rawDifficulty and difficultyRating fields
 * 
 * RUN THIS BEFORE DEPLOYING THE NEW BACKEND VERSION
 * 
 * Usage:
 *   node migrations/migrateToMultiPlatform.js
 * 
 * Options:
 *   DRY_RUN=true node migrations/migrateToMultiPlatform.js  # Preview changes without writing
 */

require('dotenv').config();
const mongoose = require('mongoose');

const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = 100;

async function migrate() {
  console.log(`[MIGRATION] Starting ${DRY_RUN ? 'DRY RUN' : 'LIVE MIGRATION'}...`);
  console.log('[MIGRATION] Connecting to MongoDB...');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('[MIGRATION] Connected to MongoDB');

  const Problem = require('../models/Problem');

  // Statistics
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = [];

  // Find all problems that need migration
  // Criteria: id is Number type OR platform field doesn't exist
  const query = {
    $or: [
      { platform: { $exists: false } },
      { id: { $type: 'number' } },
    ],
  };

  const totalToMigrate = await Problem.countDocuments(query);
  console.log(`[MIGRATION] Found ${totalToMigrate} problems to migrate`);

  if (totalToMigrate === 0) {
    console.log('[MIGRATION] No migration needed. All documents are up to date.');
    await mongoose.disconnect();
    return;
  }

  // Process in batches
  let skip = 0;
  while (skip < totalToMigrate) {
    const batch = await Problem.find(query).limit(BATCH_SIZE).skip(skip).lean();
    
    for (const problem of batch) {
      processed++;
      
      try {
        // Build update object
        const updates = {};
        
        // 1. Convert numeric ID to string format
        if (typeof problem.id === 'number') {
          updates.id = `LC-${problem.id}`;
        }
        
        // 2. Add platform field if missing
        if (!problem.platform) {
          updates.platform = 'LC';
        }
        
        // 3. Set providerTitle if missing
        if (!problem.providerTitle) {
          updates.providerTitle = 'LeetCode';
        }
        
        // 4. Copy leetcodeLink to platformLink
        if (problem.leetcodeLink && !problem.platformLink) {
          updates.platformLink = problem.leetcodeLink;
        }
        
        // 5. Set rawDifficulty and difficultyRating based on difficulty string
        if (!problem.rawDifficulty || !problem.difficultyRating) {
          const diffMap = { 'Easy': 1, 'Medium': 3, 'Hard': 5 };
          updates.rawDifficulty = problem.difficulty;
          updates.difficultyRating = diffMap[problem.difficulty] || 3;
        }

        // Check if any updates are needed
        if (Object.keys(updates).length === 0) {
          skipped++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`[DRY RUN] Would update problem ${problem.id}:`, updates);
          updated++;
        } else {
          await Problem.updateOne({ _id: problem._id }, { $set: updates });
          console.log(`[MIGRATED] Problem ${problem.id} → ${updates.id || problem.id}`);
          updated++;
        }
      } catch (err) {
        console.error(`[ERROR] Failed to migrate problem ${problem.id}:`, err.message);
        errors.push({ id: problem.id, error: err.message });
      }
    }

    skip += BATCH_SIZE;
    console.log(`[MIGRATION] Progress: ${processed}/${totalToMigrate}`);
  }

  console.log('\n[MIGRATION] Complete!');
  console.log(`  Total processed: ${processed}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already up to date): ${skipped}`);
  console.log(`  Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n[ERRORS] Details:');
    errors.forEach(e => console.log(`  - Problem ${e.id}: ${e.error}`));
  }

  // Summary stats
  const finalCount = await Problem.countDocuments({});
  const lcCount = await Problem.countDocuments({ platform: 'LC' });
  const cfCount = await Problem.countDocuments({ platform: 'CF' });
  
  console.log('\n[FINAL STATS]');
  console.log(`  Total problems in DB: ${finalCount}`);
  console.log(`  LeetCode (LC): ${lcCount}`);
  console.log(`  Codeforces (CF): ${cfCount}`);

  await mongoose.disconnect();
  console.log('[MIGRATION] Disconnected from MongoDB');
}

// Run migration
migrate().catch(err => {
  console.error('[MIGRATION] Fatal error:', err);
  process.exit(1);
});
