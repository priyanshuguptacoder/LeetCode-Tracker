const express = require('express');
const router  = express.Router();

// ─── PROTECTION: Disable debug routes in production ───────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

const devOnly = (req, res) => {
  if (!isDev) {
    return res.status(403).json({ 
      success: false, 
      error: 'Debug routes are disabled in production. Set NODE_ENV=development to enable.' 
    });
  }
};

const {
  health,
  stats,
  testLeetCode,
  dbCheck,
  countCheck,
  frontendCheck,
  manualTest,
  runAll,
  validate,
  debugStats,
  cleanupCFIds,
  backfillProblemIdNums,
  backfillDifficulty,
  backfillAll,
  syncAll,
  fixLCConsistency,
} = require('../controllers/debugController');

// Helper to wrap routes with devOnly check
const protect = (handler) => (req, res, next) => {
  if (!isDev) return devOnly(req, res);
  return handler(req, res, next);
};

// Public health/stats endpoints (no protection)
router.get('/health',               health);
router.get('/stats',                stats);

// Protected debug routes (dev only)
router.get('/test/leetcode',        protect(testLeetCode));
router.get('/debug/db-check',       protect(dbCheck));
router.get('/debug/count-check',    protect(countCheck));
router.get('/debug/frontend-check', protect(frontendCheck));
router.get('/debug/stats',          protect(debugStats));
router.get('/debug/cleanup-cf-ids', protect(cleanupCFIds));
router.get('/debug/backfill-ids',   protect(backfillProblemIdNums));
router.get('/debug/backfill-difficulty', protect(backfillDifficulty));
router.post('/debug/backfill-all', protect(backfillAll));
router.post('/debug/fix-lc-consistency', protect(fixLCConsistency));
router.post('/debug/manual-test',   protect(manualTest));
router.post('/debug/run-all',       protect(runAll));
router.post('/debug/validate',      protect(validate));
router.post('/sync/all',            protect(syncAll));

module.exports = router;
