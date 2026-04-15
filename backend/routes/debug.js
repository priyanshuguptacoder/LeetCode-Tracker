const express = require('express');
const router  = express.Router();
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
} = require('../controllers/debugController');

router.get('/health',               health);
router.get('/stats',                stats);
router.get('/test/leetcode',        testLeetCode);
router.get('/debug/db-check',       dbCheck);
router.get('/debug/count-check',    countCheck);
router.get('/debug/frontend-check', frontendCheck);
router.get('/debug/stats',          debugStats);
router.get('/debug/cleanup-cf-ids', cleanupCFIds);
router.get('/debug/backfill-ids',   backfillProblemIdNums);
router.post('/debug/manual-test',   manualTest);
router.post('/debug/run-all',       runAll);
router.post('/debug/validate',      validate);

module.exports = router;
