const express = require('express');
const router  = express.Router();
const {
  handleWebhook,
  manualSync,
  getProblems,
  getRevision,
} = require('../controllers/githubSyncController');

// Webhook — GitHub calls this on every push
router.post('/', handleWebhook);

// Manual full-repo sync (call from dashboard or CLI)
router.post('/manual', manualSync);

// List synced problems (with optional filters)
router.get('/problems', getProblems);

// Revision queue — due now + upcoming
router.get('/revision', getRevision);

module.exports = router;
