const express = require('express');
const router  = express.Router();
const {
  getStreak,
  getRecentlySolved,
  getByPlatform,
  getTargeted,
  getContestStats,
  getStreakByPlatform,
} = require('../controllers/analyticsController');

router.get('/streak', getStreak);
router.get('/streak-by-platform', getStreakByPlatform);  // GET /api/analytics/streak-by-platform
router.get('/recently-solved', getRecentlySolved);
router.get('/by-platform', getByPlatform);
router.get('/targeted', getTargeted);
router.get('/contest', getContestStats);

module.exports = router;
