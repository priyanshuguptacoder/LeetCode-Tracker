const express = require('express');
const router  = express.Router();
const { getDue, update, getStats } = require('../controllers/revisionController');

router.get('/due',    getDue);       // GET /api/revision/due
router.get('/stats',  getStats);     // GET /api/revision/stats
router.post('/update', update);      // POST /api/revision/update

module.exports = router;
