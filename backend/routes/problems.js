const express = require('express');
const router = express.Router();
const {
  getAllProblems,
  getProblem,
  createProblem,
  updateProblem,
  deleteProblem,
  reviseProblem,
  unreviseProblem,
  getStats,
  getSettings,
  alignProblems,
  getStreak,
  updateStreak,
} = require('../controllers/problemController');

// Static routes MUST come before /:id
router.get('/stats', getStats);
router.get('/settings', getSettings);
router.get('/streak', getStreak);
router.put('/streak', updateStreak);
router.post('/align', alignProblems);
router.get('/', getAllProblems);
router.post('/', createProblem);
router.get('/:id', getProblem);
router.put('/:id', updateProblem);
router.post('/:id/revise', reviseProblem);
router.post('/:id/unrevise', unreviseProblem);
router.delete('/:id', deleteProblem);

module.exports = router;
