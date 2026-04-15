const express = require('express');
const router = express.Router();

const { syncAll } = require('../controllers/syncController');

// POST /api/sync/all — unified multi-platform sync (idempotent)
router.post('/all', syncAll);

module.exports = router;

