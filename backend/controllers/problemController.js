const fs = require('fs').promises;
const path = require('path');

const PROBLEMS_FILE = path.join(__dirname, '../problems.json');

// Ensure problems.json exists
const ensureFileExists = async () => {
  try {
    await fs.access(PROBLEMS_FILE);
  } catch {
    await fs.writeFile(PROBLEMS_FILE, JSON.stringify({ problems: [] }, null, 2));
  }
};

// Read problems from file
const readProblems = async () => {
  await ensureFileExists();
  const data = await fs.readFile(PROBLEMS_FILE, 'utf8');
  return JSON.parse(data);
};

// Write problems to file
const writeProblems = async (data) => {
  await fs.writeFile(PROBLEMS_FILE, JSON.stringify(data, null, 2));
};

// GET all problems
exports.getAllProblems = async (req, res) => {
  try {
    const data = await readProblems();
    res.json({
      success: true,
      count: data.problems.length,
      data: data.problems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch problems',
      message: error.message
    });
  }
};

// GET single problem by number
exports.getProblem = async (req, res) => {
  try {
    const { number } = req.params;
    const data = await readProblems();
    const problem = data.problems.find(p => p.number === parseInt(number));
    
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: 'Problem not found'
      });
    }
    
    res.json({
      success: true,
      data: problem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch problem',
      message: error.message
    });
  }
};

// POST create new problem
exports.createProblem = async (req, res) => {
  try {
    const { number, title, difficulty, pattern, link, userDifficulty, status, solvedDate } = req.body;
    
    // Validation
    if (!number || !title || !difficulty || !pattern || !link) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields: number, title, difficulty, pattern, link'
      });
    }
    
    const data = await readProblems();
    
    // Check for duplicate
    const exists = data.problems.find(p => p.number === parseInt(number));
    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'Problem already exists'
      });
    }
    
    // Create new problem
    const newProblem = {
      number: parseInt(number),
      title,
      difficulty,
      pattern,
      link,
      userDifficulty: userDifficulty || difficulty,
      status: status || 'Not Started',
      solvedDate: solvedDate || null,
      createdAt: new Date().toISOString()
    };
    
    data.problems.push(newProblem);
    data.problems.sort((a, b) => a.number - b.number);
    
    await writeProblems(data);
    
    res.status(201).json({
      success: true,
      data: newProblem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create problem',
      message: error.message
    });
  }
};

// PUT update problem
exports.updateProblem = async (req, res) => {
  try {
    const { number } = req.params;
    const updates = req.body;
    
    const data = await readProblems();
    const index = data.problems.findIndex(p => p.number === parseInt(number));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Problem not found'
      });
    }
    
    // Update problem
    data.problems[index] = {
      ...data.problems[index],
      ...updates,
      number: parseInt(number), // Ensure number doesn't change
      updatedAt: new Date().toISOString()
    };
    
    await writeProblems(data);
    
    res.json({
      success: true,
      data: data.problems[index]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update problem',
      message: error.message
    });
  }
};

// DELETE problem
exports.deleteProblem = async (req, res) => {
  try {
    const { number } = req.params;
    
    const data = await readProblems();
    const index = data.problems.findIndex(p => p.number === parseInt(number));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Problem not found'
      });
    }
    
    const deletedProblem = data.problems.splice(index, 1)[0];
    await writeProblems(data);
    
    res.json({
      success: true,
      message: 'Problem deleted successfully',
      data: deletedProblem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete problem',
      message: error.message
    });
  }
};

// GET stats
exports.getStats = async (req, res) => {
  try {
    const data = await readProblems();
    const problems = data.problems;
    
    // Calculate stats
    const total = problems.length;
    const solved = problems.filter(p => p.status === 'Done').length;
    const notStarted = problems.filter(p => p.status === 'Not Started').length;
    const inProgress = problems.filter(p => p.status === 'In Progress').length;
    
    // Difficulty distribution
    const easy = problems.filter(p => p.difficulty === 'Easy').length;
    const medium = problems.filter(p => p.difficulty === 'Medium').length;
    const hard = problems.filter(p => p.difficulty === 'Hard').length;
    
    const easySolved = problems.filter(p => p.difficulty === 'Easy' && p.status === 'Done').length;
    const mediumSolved = problems.filter(p => p.difficulty === 'Medium' && p.status === 'Done').length;
    const hardSolved = problems.filter(p => p.difficulty === 'Hard' && p.status === 'Done').length;
    
    // Pattern distribution
    const patterns = {};
    problems.forEach(p => {
      if (!patterns[p.pattern]) {
        patterns[p.pattern] = { total: 0, solved: 0 };
      }
      patterns[p.pattern].total++;
      if (p.status === 'Done') {
        patterns[p.pattern].solved++;
      }
    });
    
    res.json({
      success: true,
      data: {
        total,
        solved,
        notStarted,
        inProgress,
        difficulty: {
          easy: { total: easy, solved: easySolved },
          medium: { total: medium, solved: mediumSolved },
          hard: { total: hard, solved: hardSolved }
        },
        patterns
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate stats',
      message: error.message
    });
  }
};
