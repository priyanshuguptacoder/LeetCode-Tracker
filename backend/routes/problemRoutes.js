const express = require('express');
const router = express.Router();

// Try to load controller with error handling
let problemController;
try {
  problemController = require('../controllers/problemController');
  console.log('✅ Problem controller loaded successfully');
} catch (error) {
  console.error('❌ Failed to load problem controller:', error.message);
  problemController = {
    getAllProblems: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
    getProblem: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
    createProblem: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
    updateProblem: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
    deleteProblem: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
    getStats: (req, res) => res.status(500).json({ error: 'Controller not loaded' })
  };
}

const {
  getAllProblems,
  getProblem,
  createProblem,
  updateProblem,
  deleteProblem,
  getStats
} = problemController;

// Problem routes
router.get('/problems', getAllProblems);
router.get('/problems/:number', getProblem);
router.post('/problems', createProblem);
router.put('/problems/:number', updateProblem);
router.delete('/problems/:number', deleteProblem);

// Stats route
router.get('/stats', getStats);

module.exports = router;
