const express = require('express');
const router  = express.Router();
const {
  getProblem,
  manualEntry,
  listProblems,
  getRevision,
  getStreaks,
} = require('../controllers/leetcodeController');

// NOTE: order matters — specific paths before :slug param
router.get('/list',      listProblems);  // GET  /api/problem/list
router.get('/revision',  getRevision);   // GET  /api/problem/revision
router.get('/streaks',   getStreaks);    // GET  /api/problem/streaks
router.post('/manual',   manualEntry);   // POST /api/problem/manual
router.get('/:slug',     getProblem);    // GET  /api/problem/:slug

module.exports = router;
