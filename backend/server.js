require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');

// ─── Environment validation ───────────────────────────────────────────────────
function validateEnv() {
  const missing = [];
  if (!process.env.MONGO_URI) missing.push('MONGO_URI');

  if (!process.env.GITHUB_TOKEN)
    console.warn('[INIT] ⚠️  GITHUB_TOKEN not set — GitHub API calls will be rate-limited');
  if (!process.env.GITHUB_WEBHOOK_SECRET)
    console.warn('[INIT] ⚠️  GITHUB_WEBHOOK_SECRET not set — webhook signature verification disabled');

  if (missing.length > 0) {
    console.error(`[ERROR] Missing required env vars: ${missing.join(', ')} — server cannot start`);
    process.exit(1);
  }
  console.log('[INIT] Environment OK');
}
validateEnv();

const problemRoutes    = require('./routes/problems');
const githubSyncRoutes = require('./routes/githubSync');
const debugRoutes      = require('./routes/debug');
const { manualProblemEntry } = require('./controllers/githubSyncController');

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
app.use('/api/problems',        problemRoutes);
app.use('/api/github-sync',     githubSyncRoutes);
app.post('/api/manual-problem', manualProblemEntry);
app.use('/api',                 debugRoutes);

// Root — lists all available endpoints
app.get('/', (req, res) => {
  res.json({
    status:  'running',
    db:      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      // Health & status
      'GET  /api/health':                   'Unified health — DB + GitHub + env + lastSync',
      'GET  /api/health/github-sync':       'Webhook health (alias)',
      // GitHub
      'GET  /api/test/github':              'Live GitHub API + repo + tree test',
      // DB debug
      'GET  /api/debug/db-check':           'DB integrity — counts, dupes, missing fields',
      'GET  /api/debug/frontend-check':     'Total + latest 5 problems for frontend',
      // Test sequences
      'POST /api/debug/manual-test':        'End-to-end: insert + GitHub merge + assert',
      'POST /api/debug/run-all':            'Full system validation — all checks in sequence',
      // Core
      'POST /api/manual-problem':           'Manual problem entry',
      'POST /api/github-sync':              'GitHub webhook handler',
      'POST /api/github-sync/manual':       'Full repo sync trigger',
      'GET  /api/github-sync/problems':     'List synced problems',
      'GET  /api/github-sync/streaks':      'Streak stats',
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

// ─── Connect DB → start server ────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[INIT] MongoDB connected');
    app.listen(PORT, () => {
      console.log(`[INIT] Server running on port ${PORT}`);
      console.log('[INIT] Debug endpoints ready:');
      console.log('[INIT]   GET  /api/health');
      console.log('[INIT]   GET  /api/test/github');
      console.log('[INIT]   GET  /api/debug/db-check');
      console.log('[INIT]   GET  /api/debug/frontend-check');
      console.log('[INIT]   POST /api/debug/manual-test');
      console.log('[INIT]   POST /api/debug/run-all');
    });
  })
  .catch((err) => {
    console.error(`[ERROR] MongoDB connection failed: ${err.message}`);
    process.exit(1);
  });

module.exports = app;
