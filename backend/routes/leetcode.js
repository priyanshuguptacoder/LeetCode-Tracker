const express = require('express');
const router  = express.Router();
const {
  getProblem,
  manualEntry,
  listProblems,
  getRevision,
  getStreaks,
  syncSubmissions,
  syncStatus,
  getRecentProblems,
  getTodayProblems,
} = require('../controllers/leetcodeController');

// NOTE: specific paths must come before :slug param
router.get('/list',      listProblems);       // GET  /api/problem/list
router.get('/revision',  getRevision);        // GET  /api/problem/revision
router.get('/streaks',   getStreaks);         // GET  /api/problem/streaks
router.get('/recent',    getRecentProblems);  // GET  /api/problem/recent
router.get('/today',     getTodayProblems);   // GET  /api/problem/today
router.post('/manual',   manualEntry);        // POST /api/problem/manual
router.post('/sync',     syncSubmissions);    // POST /api/problem/sync
router.get('/sync/status', syncStatus);       // GET  /api/problem/sync/status
router.get('/:slug',     getProblem);         // GET  /api/problem/:slug

module.exports = router;
