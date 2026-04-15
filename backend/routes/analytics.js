const express = require('express');
const router  = express.Router();
const {
  getStreak,
  getRecentlySolved,
  getByPlatform,
  getTargeted,
  getContestStats
} = require('../controllers/analyticsController');

router.get('/streak', getStreak);               // GET /api/analytics/streak
router.get('/recently-solved', getRecentlySolved); // GET /api/analytics/recently-solved
router.get('/by-platform', getByPlatform);        // GET /api/analytics/by-platform
router.get('/targeted', getTargeted);             // GET /api/analytics/targeted
router.get('/contest', getContestStats);          // GET /api/analytics/contest

module.exports = router;
