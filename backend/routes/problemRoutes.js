const express = require('express');
const router = express.Router();
const {
  getAllProblems,
  getProblem,
  createProblem,
  updateProblem,
  deleteProblem,
  getStats
} = require('../controllers/problemController');

// Problem routes
router.get('/problems', getAllProblems);
router.get('/problems/:number', getProblem);
router.post('/problems', createProblem);
router.put('/problems/:number', updateProblem);
router.delete('/problems/:number', deleteProblem);

// Stats route
router.get('/stats', getStats);

module.exports = router;
