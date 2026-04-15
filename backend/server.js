require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');

// ─── Environment validation ───────────────────────────────────────────────────
function validateEnv() {
  if (!process.env.MONGO_URI) {
    console.error('[ERROR] Missing required env var: MONGO_URI — server cannot start');
    process.exit(1);
  }
  if (!process.env.LEETCODE_SESSION || !process.env.LEETCODE_CSRF || !process.env.LEETCODE_USERNAME) {
    console.warn('[WARN] LEETCODE_SESSION / LEETCODE_CSRF / LEETCODE_USERNAME not set — POST /api/problem/sync will be unavailable');
  }
  console.log('[INIT] Environment OK');
}
validateEnv();

// ─── Database Connection Logging ─────────────────────────────────────────────
const maskedUri = process.env.MONGO_URI?.replace(/\/\/([^:]+):[^@]+@/, '//***:***@') || 'not-set';
console.log('[DB] Mongo URI:', maskedUri);

const problemRoutes     = require('./routes/problems');
const leetcodeRoutes    = require('./routes/leetcode');
const codeforcesRoutes  = require('./routes/codeforces');
const syncRoutes       = require('./routes/sync');
const debugRoutes       = require('./routes/debug');
const analyticsRoutes   = require('./routes/analytics');
const revisionRoutes    = require('./routes/revision');

const app  = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = [
  "https://competativeprogrammingtrackerpriyanshu.vercel.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
].map(o => (o || '').trim().replace(/\/+$/, '')); // full normalization

console.log('[INIT] CORS allowedOrigins:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow non-browser requests (Postman/curl)
    if (!origin) return callback(null, true);

    // 2. Normalize incoming origin
    const normalized = origin.trim().replace(/\/+$/, '');

    // 3. Robust validation
    if (allowedOrigins.includes(normalized)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked mismatch: "${origin}" | Expected from: ${JSON.stringify(allowedOrigins)}`);
      callback(new Error('CORS_ORIGIN_NOT_ALLOWED'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
};

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Enable preflight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/problems',     problemRoutes);
app.use('/api/problem',      leetcodeRoutes);
app.use('/api/codeforces',   codeforcesRoutes);
app.use('/api/sync',         syncRoutes);
app.use('/api',              debugRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/revision',     revisionRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    db:     mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      'GET  /api/health':               'Health — DB + LeetCode API',
      'GET  /api/test/leetcode':        'Live LeetCode GraphQL test',
      'GET  /api/debug/db-check':       'DB integrity report',
      'GET  /api/debug/count-check':    'Problem vs Submission count consistency',
      'GET  /api/debug/frontend-check': 'Latest 5 problems for frontend',
      'POST /api/debug/manual-test':    'End-to-end insert + merge test',
      'POST /api/debug/run-all':        'Full system validation',
      'POST /api/debug/validate':       '10-case validation suite',
      'GET  /api/problem/:slug':        'Fetch problem from LeetCode API',
      'POST /api/problem/manual':       'Manual problem entry',
      'POST /api/problem/sync':         'Auto-sync recent accepted submissions from LeetCode',
      'GET  /api/problem/sync/status':  'LeetCode session health check',
      'GET  /api/problem/list':         'List all tracked problems',
      'GET  /api/problem/recent':       'Last 20 solved problems by lastSubmittedAt',
      'GET  /api/problem/today':        'Problems solved today',
      'GET  /api/problem/revision':     'Revision queue',
      'GET  /api/problem/streaks':      'Streak stats',
      'GET  /api/problems':             'All problems (tracker, ?platform=LC|CF|ALL)',
      'POST /api/codeforces/sync':      'Sync Codeforces submissions',
      'GET  /api/codeforces/info':      'Codeforces user info',
      'GET  /api/codeforces/stats':     'Codeforces problem stats',
      'POST /api/sync/all':             'Unified sync — BOTH LeetCode + Codeforces (Promise.allSettled)',
      'GET  /api/analytics/recently-solved': 'Recently solved from both platforms',
      'GET  /api/analytics/by-platform': 'Stats grouped by platform (LC/CF)',
      'GET  /api/analytics/targeted':   'Targeted problems from both platforms',
      'GET  /api/analytics/contest':    'Contest stats (rating, rank, contests) for LC + CF',
      'GET  /api/revision/stats':       'Revision stats by platform',
      'POST /api/debug/backfill-all':   'Comprehensive DB backfill for all data issues',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] Unhandled: ${err.message}`);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('[INIT] MongoDB connected');
    
    // ─── VERIFY DATA EXISTS ──────────────────────────────────────────────────
    try {
      const Problem = require('./models/Problem');
      const count = await Problem.countDocuments();
      console.log('[COUNT] Problems in database:', count);
      if (count === 0) {
        console.warn('[WARN] Database appears empty — check MONGO_URI is correct');
      }
    } catch (e) {
      console.error('[COUNT] Failed to count problems:', e.message);
    }

    // Startup backfill: ensure solved problems always have both solvedDate and lastSubmittedAt
    try {
      const Problem = require('./models/Problem');

      // Direction 1: solvedDate exists but lastSubmittedAt is null → copy solvedDate → lastSubmittedAt
      const missingLast = await Problem.find({ solved: true, solvedDate: { $ne: null }, lastSubmittedAt: null }).lean();
      if (missingLast.length > 0) {
        await Problem.bulkWrite(missingLast.map(doc => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { lastSubmittedAt: doc.solvedDate } },
          },
        })));
        console.log(`[BACKFILL] Set lastSubmittedAt on ${missingLast.length} problems`);
      }

      // Direction 2: solved=true but solvedDate is null → copy lastSubmittedAt → solvedDate (CRITICAL)
      const missingSolved = await Problem.find({
        solved: true,
        solvedDate: null,
        lastSubmittedAt: { $ne: null },
      }).lean();
      if (missingSolved.length > 0) {
        await Problem.bulkWrite(missingSolved.map(doc => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { solvedDate: doc.lastSubmittedAt } },
          },
        })));
        console.log(`[BACKFILL] Set solvedDate on ${missingSolved.length} problems (was null)`);
      }

      // Direction 3: solved=true but BOTH dates are null → use now as fallback
      const bothNull = await Problem.find({
        solved: true,
        solvedDate: null,
        $or: [{ lastSubmittedAt: null }, { lastSubmittedAt: { $exists: false } }],
      }).lean();
      if (bothNull.length > 0) {
        const now = new Date();
        await Problem.bulkWrite(bothNull.map(doc => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { solvedDate: now, lastSubmittedAt: now } },
          },
        })));
        console.warn(`[BACKFILL] Set solvedDate=now on ${bothNull.length} problems (both dates were null)`);
      }
    } catch (e) {
      console.warn('[BACKFILL] Date backfill failed:', e.message);
    }

    // Backfill: set isDeleted=false on all existing docs that predate the soft-delete field
    try {
      const Problem    = require('./models/Problem');
      const Submission = require('./models/Submission');
      const [pr, sr] = await Promise.all([
        Problem.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } }),
        Submission.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } }),
      ]);
      if (pr.modifiedCount > 0) console.log(`[BACKFILL] isDeleted=false on ${pr.modifiedCount} Problems`);
      if (sr.modifiedCount > 0) console.log(`[BACKFILL] isDeleted=false on ${sr.modifiedCount} Submissions`);
    } catch (e) {
      console.warn('[BACKFILL] isDeleted backfill failed:', e.message);
    }

    // Backfill: strip leading "#N " from LC problem titles and ensure problemIdNum is set
    try {
      const Problem = require('./models/Problem');
      // Find LC problems whose title starts with "#" (e.g. "#63 Unique Paths II")
      const hashTitles = await Problem.find({
        platform: 'LC',
        title: /^#/,
      }, { _id: 1, title: 1, uniqueId: 1, id: 1, problemIdNum: 1 }).lean();

      if (hashTitles.length > 0) {
        await Problem.bulkWrite(hashTitles.map(doc => {
          // "#63 Unique Paths II" → num=63, cleanTitle="Unique Paths II"
          const m = doc.title.match(/^#(\d+)\s+(.*)/);
          const cleanTitle = m ? m[2].trim() : doc.title.replace(/^#+\s*/, '').trim();
          const numFromTitle = m ? parseInt(m[1], 10) : null;
          // Prefer existing problemIdNum, then extracted from title, then from uniqueId
          const idMatch = (doc.uniqueId || doc.id || '').match(/(\d+)/);
          const problemIdNum = doc.problemIdNum || numFromTitle || (idMatch ? parseInt(idMatch[1], 10) : 999999);
          return {
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { title: cleanTitle, problemIdNum } },
            },
          };
        }));
        console.log(`[BACKFILL] Stripped "#" prefix from ${hashTitles.length} LC problem titles`);
      }
    } catch (e) {
      console.warn('[BACKFILL] Title cleanup backfill failed:', e.message);
    }
    try {
      const Problem = require('./models/Problem');
      const lcMissing = await Problem.find({
        platform: 'LC',
        $or: [{ problemIdNum: null }, { problemIdNum: { $exists: false } }],
      }, { _id: 1, uniqueId: 1, id: 1 }).lean();
      if (lcMissing.length > 0) {
        await Problem.bulkWrite(lcMissing.map(doc => {
          const match = (doc.uniqueId || doc.id || '').match(/(\d+)/);
          const num = match ? parseInt(match[1], 10) : 999999;
          return { updateOne: { filter: { _id: doc._id }, update: { $set: { problemIdNum: num } } } };
        }));
        console.log(`[BACKFILL] Set problemIdNum on ${lcMissing.length} LC problems`);
      }
    } catch (e) {
      console.warn('[BACKFILL] problemIdNum backfill failed:', e.message);
    }

    // Backfill: ensure CF problems have numeric contestId for correct sorting
    try {
      const Problem = require('./models/Problem');
      const cfMissing = await Problem.find({
        platform: 'CF',
        $or: [{ contestId: null }, { contestId: { $exists: false } }],
      }, { _id: 1, uniqueId: 1 }).lean();
      if (cfMissing.length > 0) {
        await Problem.bulkWrite(cfMissing.map(doc => {
          const match = (doc.uniqueId || '').match(/CF-(\d+)/);
          const num = match ? parseInt(match[1], 10) : 999999;
          return { updateOne: { filter: { _id: doc._id }, update: { $set: { contestId: num } } } };
        }));
        console.log(`[BACKFILL] Set contestId on ${cfMissing.length} CF problems`);
      }
    } catch (e) {
      console.warn('[BACKFILL] CF contestId backfill failed:', e.message);
    }

    // Backfill: compute and store isTLE on all CF problems
    try {
      const Problem = require('./models/Problem');
      const TLE_TOPICS = ['dp', 'graphs', 'greedy', 'binary search'];
      const cfProblems = await Problem.find({ platform: 'CF' }, { _id: 1, rating: 1, rawDifficulty: 1, topics: 1 }).lean();
      if (cfProblems.length > 0) {
        const ops = cfProblems.map(doc => {
          const r = Number(doc.rawDifficulty || doc.rating || 0);
          const inBand = r >= 1200 && r <= 1800;
          const hasTag = Array.isArray(doc.topics) && doc.topics.some(t =>
            TLE_TOPICS.includes((t || '').toLowerCase())
          );
          return {
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { isTLE: inBand || hasTag } },
            },
          };
        });
        const res = await Problem.bulkWrite(ops);
        console.log(`[BACKFILL] isTLE set on ${res.modifiedCount}/${cfProblems.length} CF problems`);
      }
    } catch (e) {
      console.warn('[BACKFILL] isTLE backfill failed:', e.message);
    }

    // ONE-TIME: Hard-reset all CF problems and re-sync from scratch
    // Guarded by Settings flag 'cfHardResetDone' — runs exactly once per deployment cycle
    try {
      const Problem  = require('./models/Problem');
      const Settings = require('./models/Settings');
      const flag = await Settings.findOne({ key: 'global' }, { cfHardResetDone: 1 }).lean();
      if (!flag?.cfHardResetDone) {
        const del = await Problem.deleteMany({ platform: 'CF' });
        console.log(`[CF RESET] Deleted ${del.deletedCount} CF problems for clean re-sync`);
        await Settings.findOneAndUpdate(
          { key: 'global' },
          { $set: { cfHardResetDone: true } },
          { upsert: true }
        );
        console.log('[CF RESET] Flag set — will not run again');
      }
    } catch (e) {
      console.warn('[CF RESET] Failed:', e.message);
    }

    // Initialize automated 12-hour sync for Codeforces
    const { initCron } = require('./tasks/cronSync');
    initCron();

    app.listen(PORT, () => {
      console.log(`[INIT] Server running on port ${PORT}`);
      console.log('[INIT] Automation: Codeforces 12-hour sync started');
      console.log('[INIT] Key endpoints:');
      console.log('[INIT]   GET  /api/health');
      console.log('[INIT]   GET  /api/problem/:slug');
      console.log('[INIT]   POST /api/problem/manual');
      console.log('[INIT]   POST /api/debug/run-all');
    });
  })
  .catch((err) => {
    console.error(`[ERROR] MongoDB connection failed: ${err.message}`);
    process.exit(1);
  });

module.exports = app;
