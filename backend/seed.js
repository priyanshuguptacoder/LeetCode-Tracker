require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Problem = require('./models/Problem');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

// ── Extract dataset ──────────────────────────────────────────────────────────
const datasetPath = path.join(__dirname, '../leetcode_full_dataset.js');
const extractScript =
  fs.readFileSync(datasetPath, 'utf8').replace(/console\.log[\s\S]*?;/g, '') +
  '\nprocess.stdout.write(JSON.stringify({ solved: solvedProblemsFull, targets: targetProblems }));';

const tmpScript = path.join(__dirname, '_extract.js');
fs.writeFileSync(tmpScript, extractScript);

let solvedProblemsFull, targetProblems;
try {
  const output = execSync(`node "${tmpScript}"`, { encoding: 'utf8' });
  const parsed = JSON.parse(output);
  solvedProblemsFull = parsed.solved;
  targetProblems = parsed.targets;
} finally {
  fs.unlinkSync(tmpScript);
}

console.log(`📦 Loaded ${solvedProblemsFull.length} solved + ${targetProblems.length} target problems from dataset`);

// ── Parse "DD-MMM" → JS Date ─────────────────────────────────────────────────
const MONTH_MAP = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDDMMM(dateStr) {
  if (!dateStr) return null;
  const [day, mon] = dateStr.split('-');
  const monthIndex = MONTH_MAP[mon];
  if (monthIndex === undefined) return null;
  // Use 2026 as the base year (adjust if your data spans multiple years)
  const year = 2026;
  const d = new Date(year, monthIndex, parseInt(day, 10));
  return isNaN(d.getTime()) ? null : d;
}

// ── Seed ─────────────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Solved problems
    const solvedOps = solvedProblemsFull.map((p) => {
      const solvedDate = parseDDMMM(p.date);
      return {
        updateOne: {
          filter: { id: p.number },
          update: {
            $set: {
              id: p.number,
              title: p.title,
              difficulty: p.difficulty,
              topics: p.pattern ? [p.pattern] : [],
              solved: true,
              leetcodeLink: p.link,
              date: p.date || '',
              revisionCount: p.revisionCount || 0,
              solvedDate: solvedDate,
            },
          },
          upsert: true,
        },
      };
    });

    // Target (unsolved) problems — only insert if not already in DB as solved
    const targetOps = targetProblems.map((p) => ({
      updateOne: {
        filter: { id: p.number, solved: { $ne: true } }, // don't overwrite solved problems
        update: {
          $setOnInsert: {
            id: p.number,
            title: p.title,
            difficulty: p.difficulty,
            topics: [],
            solved: false,
            inProgress: false,
            leetcodeLink: p.link,
            date: '',
            revisionCount: 0,
            solvedDate: null,
          },
        },
        upsert: true,
      },
    }));

    const allOps = [...solvedOps, ...targetOps];
    const result = await Problem.bulkWrite(allOps, { ordered: false });
    console.log(`✅ Seed complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
    console.log(`   Solved: ${solvedProblemsFull.length}, Targets: ${targetProblems.length}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
