const express = require('express');
const router  = express.Router();
const { getStreak } = require('../controllers/analyticsController');

router.get('/streak', getStreak);

module.exports = router;
