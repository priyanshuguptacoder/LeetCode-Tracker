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

const problemRoutes  = require('./routes/problems');
const leetcodeRoutes = require('./routes/leetcode');
const debugRoutes    = require('./routes/debug');
const analyticsRoutes = require('./routes/analytics');
const revisionRoutes  = require('./routes/revision');

const app  = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
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
app.use('/api/problems',  problemRoutes);
app.use('/api/problem',   leetcodeRoutes);
app.use('/api',           debugRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/revision',  revisionRoutes);

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
      'GET  /api/problems':             'All problems (tracker)',
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

    // One-time backfill: copy solvedDate → lastSubmittedAt for problems missing it
    try {
      const Problem = require('./models/Problem');
      const result = await Problem.updateMany(
        { solved: true, solvedDate: { $ne: null }, lastSubmittedAt: null },
        [{ $set: { lastSubmittedAt: '$solvedDate' } }]
      );
      if (result.modifiedCount > 0) {
        console.log(`[BACKFILL] Set lastSubmittedAt on ${result.modifiedCount} problems`);
      }
    } catch (e) {
      console.warn('[BACKFILL] lastSubmittedAt backfill failed:', e.message);
    }

    app.listen(PORT, () => {
      console.log(`[INIT] Server running on port ${PORT}`);
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
