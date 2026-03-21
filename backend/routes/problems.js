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
  targetProblem,
  untargetProblem,
  toggleStriver,
  getStriverStats,
  markStriverProblems,
  getStats,
  getSettings,
  alignProblems,
  getStreak,
  updateStreak,
  resetStreakAuto,
  getRevisionList,
  getSuggestions,
} = require('../controllers/problemController');

// Static routes MUST come before /:id
router.get('/stats', getStats);
router.get('/settings', getSettings);
router.get('/streak', getStreak);
router.put('/streak', updateStreak);
router.post('/streak/reset', resetStreakAuto);
router.get('/striver-stats', getStriverStats);
router.get('/revision-list', getRevisionList);
router.get('/suggestions', getSuggestions);
router.post('/mark-striver', markStriverProblems);
router.post('/align', alignProblems);
router.get('/', getAllProblems);
router.post('/', createProblem);
router.get('/:id', getProblem);
router.put('/:id', updateProblem);
router.post('/:id/revise', reviseProblem);
router.post('/:id/unrevise', unreviseProblem);
router.post('/:id/target', targetProblem);
router.post('/:id/untarget', untargetProblem);
router.patch('/:id/striver', toggleStriver);
router.delete('/:id', deleteProblem);

module.exports = router;
