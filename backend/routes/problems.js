// updated: added streak/reset route for manual override reset
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
  toggleTLE,
  getTLEStats,
  getStriverStats,
  markStriverProblems,
  getStats,
  getSettings,
  alignProblems,
  getStreak,
  resetStreakAuto,
  getRevisionList,
  getSuggestions,
  validateStreak,
} = require('../controllers/problemController');

// Static routes MUST come before /:id
router.get('/stats', getStats);
router.get('/settings', getSettings);
router.get('/streak', getStreak);
router.post('/streak/reset', resetStreakAuto);
router.get('/streak/validate', validateStreak);
router.get('/striver-stats', getStriverStats);
router.get('/tle-stats', getTLEStats);
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
router.patch('/:id/tle', toggleTLE);
router.delete('/:id', deleteProblem);

module.exports = router;
