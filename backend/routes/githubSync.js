const express = require('express');
const router  = express.Router();
const {
  handleWebhook,
  manualSync,
  manualProblemEntry,
  getProblems,
  getRevision,
  getStreaks,
} = require('../controllers/githubSyncController');

router.post('/',              handleWebhook);       // GitHub webhook (push events)
router.post('/manual',        manualSync);          // Full repo sync trigger
router.post('/manual-problem', manualProblemEntry); // Manual problem entry
router.get('/problems',       getProblems);         // List synced problems
router.get('/revision',       getRevision);         // Revision queue
router.get('/streaks',        getStreaks);           // Streak stats

module.exports = router;
