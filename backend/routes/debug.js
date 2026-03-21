const express = require('express');
const router  = express.Router();
const {
  health,
  testLeetCode,
  dbCheck,
  countCheck,
  frontendCheck,
  manualTest,
  runAll,
  validate,
  debugStats,
} = require('../controllers/debugController');

router.get('/health',               health);
router.get('/test/leetcode',        testLeetCode);
router.get('/debug/db-check',       dbCheck);
router.get('/debug/count-check',    countCheck);
router.get('/debug/frontend-check', frontendCheck);
router.get('/debug/stats',          debugStats);
router.post('/debug/manual-test',   manualTest);
router.post('/debug/run-all',       runAll);
router.post('/debug/validate',      validate);

module.exports = router;
