const express = require('express');
const router = express.Router();
const {
  syncCodeforces,
  getCodeforcesInfo,
  getCodeforcesStats,
} = require('../controllers/codeforcesController');

// POST /api/codeforces/sync   — fetch + insert CF problems
router.post('/sync', syncCodeforces);

// GET  /api/codeforces/info   — CF user info (rating, rank)
router.get('/info', getCodeforcesInfo);

// GET  /api/codeforces/stats  — CF problem stats from DB
router.get('/stats', getCodeforcesStats);

module.exports = router;
