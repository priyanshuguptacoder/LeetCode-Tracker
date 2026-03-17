const express = require('express');
const router = express.Router();
const {
  getAllProblems,
  getProblem,
  createProblem,
  updateProblem,
  deleteProblem,
  getStats,
  getSettings,
  alignProblems,
} = require('../controllers/problemController');

router.get('/stats', getStats);
router.get('/settings', getSettings);
router.get('/', getAllProblems);
router.get('/:id', getProblem);
router.post('/align', alignProblems);
router.post('/', createProblem);
router.put('/:id', updateProblem);
router.delete('/:id', deleteProblem);

module.exports = router;
