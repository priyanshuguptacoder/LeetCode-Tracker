const express = require('express');
const router  = express.Router();
const {
  health,
  healthCheck,
  testGitHub,
  dbCheck,
  debugProblems,
  frontendCheck,
  manualTest,
  runAll,
} = require('../controllers/debugController');

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health',              health);       // unified: DB + GitHub + env + lastSync
router.get('/health/github-sync',  healthCheck);  // backwards compat alias

// ── GitHub test ───────────────────────────────────────────────────────────────
router.get('/test/github',         testGitHub);   // live GitHub API + repo + tree

// ── DB checks ─────────────────────────────────────────────────────────────────
router.get('/debug/db-check',      dbCheck);         // counts, dupes, missing fields, lastInserted
router.get('/debug/problems',      debugProblems);   // backwards compat alias
router.get('/debug/frontend-check', frontendCheck);  // total + latest 5 for frontend

// ── Test sequences ────────────────────────────────────────────────────────────
router.post('/debug/manual-test',  manualTest);   // insert + merge + assert
router.post('/debug/run-all',      runAll);        // full system validation sequence

module.exports = router;
