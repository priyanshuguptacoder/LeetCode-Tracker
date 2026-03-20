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
} = require('../controllers/debugController');

router.get('/health',               health);        // DB + LeetCode API + env
router.get('/test/leetcode',        testLeetCode);  // live LeetCode GraphQL test
router.get('/debug/db-check',       dbCheck);       // counts, dupes, missing fields
router.get('/debug/count-check',    countCheck);    // Problem vs Submission count consistency
router.get('/debug/frontend-check', frontendCheck); // total + latest 5
router.post('/debug/manual-test',   manualTest);    // insert + merge + assert
router.post('/debug/run-all',       runAll);        // full system validation
router.post('/debug/validate',      validate);      // 10-case validation suite

module.exports = router;
