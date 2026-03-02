const { useState, useEffect, useRef } = React;

function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  const getInitialState = () => {
    const saved = localStorage.getItem('priyanshu-leetcode-state');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      statusOverrides: {},
      userDifficultyOverrides: {},
      customProblems: [],
      deletedProblems: [],
      solvedDates: {}, // { problemNumber: "YYYY-MM-DD" }
      historicalDatesGenerated: false,
      monthlyTarget: 30,
      todayCount: 0,
      weeklyCount: 0,
      lastUpdate: new Date().toDateString()
    };
  };

  const [state, setState] = useState(getInitialState());
  const [darkMode, setDarkMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [patternFilter, setPatternFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Password protection
  const ADMIN_PASSWORD = '9653007120';

  // Form state for modal
  const [formData, setFormData] = useState({
    number: '',
    title: '',
    difficulty: 'Medium',
    type: 'Solved',
    pattern: '',
    link: ''
  });

  // ============================================
  // SMART PATTERN DETECTION ENGINE
  // ============================================
  
  const detectPattern = (title) => {
    const titleLower = title.toLowerCase();
    
    const patterns = {
      'Matrix': ['matrix', 'grid', '2d array', 'board'],
      'Tree': ['tree', 'binary tree', 'bst', 'binary search tree', 'inorder', 'preorder', 'postorder', 'level order'],
      'Graph': ['graph', 'connected', 'island', 'course', 'clone', 'network', 'path', 'cycle'],
      'Sliding Window': ['substring', 'subarray', 'window', 'consecutive', 'longest', 'minimum window'],
      'Arrays': ['array', 'sum', 'product', 'rotate', 'duplicate', 'missing', 'majority'],
      'Linked List': ['linked list', 'list', 'node', 'cycle', 'reverse list'],
      'Stack': ['stack', 'parentheses', 'valid', 'bracket', 'calculator', 'monotonic'],
      'Queue': ['queue', 'circular', 'deque'],
      'Dynamic Programming': ['dp', 'maximum', 'minimum', 'ways', 'count', 'subsequence', 'distance', 'coin', 'climb', 'house robber', 'stock'],
      'Binary Search': ['search', 'sorted', 'find', 'median', 'kth', 'rotated'],
      'Two Pointers': ['two pointer', 'palindrome', 'reverse', 'container', 'trap'],
      'Heap': ['heap', 'kth', 'priority', 'median', 'top k'],
      'Backtracking': ['combination', 'permutation', 'generate', 'subset', 'n-queens', 'sudoku'],
      'Strings': ['string', 'character', 'word', 'anagram', 'encode', 'decode'],
      'Greedy': ['greedy', 'interval', 'meeting', 'jump', 'gas station'],
      'Trie': ['trie', 'prefix', 'word search'],
      'Bit Manipulation': ['bit', 'xor', 'binary', 'power of'],
      'Design': ['design', 'implement', 'lru', 'lfu', 'data structure'],
      'Math': ['math', 'digit', 'number', 'factorial', 'prime'],
      'Prefix Sum': ['prefix', 'subarray sum', 'range sum']
    };

    for (const [pattern, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return pattern;
      }
    }
    
    return 'Miscellaneous';
  };

  // ============================================
  // PATTERN NORMALIZATION
  // ============================================
  
  const normalizePattern = (pattern) => {
    const patternMap = {
      'Arrays / Hashing': 'Arrays',
      'Arrays / Matrix': 'Matrix',
      'Arrays / Prefix': 'Prefix Sum',
      'Arrays / Sorting': 'Arrays',
      'Tree / DFS': 'Tree',
      'Tree / BFS': 'Tree',
      'Graph / DFS': 'Graph',
      'Graph / BFS': 'Graph',
      'Graph / Topological Sort': 'Graph',
      'Trie / Backtracking': 'Trie'
    };
    
    return patternMap[pattern] || pattern;
  };

  // ============================================
  // HISTORICAL DATE GENERATION
  // ============================================
  
  const generateHistoricalDates = (solvedProblems) => {
    const ACTIVE_DAYS = 40;
    const MAX_STREAK = 37;
    const totalProblems = solvedProblems.length;
    
    // Generate 40 active days with gaps for realistic streak
    const today = new Date();
    const activeDates = [];
    let currentDate = new Date(today);
    let consecutiveDays = 0;
    let daysAdded = 0;
    
    while (daysAdded < ACTIVE_DAYS) {
      // Add streak breaks to match max streak of 37
      if (consecutiveDays >= MAX_STREAK) {
        // Add 1-3 day gap
        const gap = Math.floor(Math.random() * 3) + 1;
        currentDate.setDate(currentDate.getDate() - gap);
        consecutiveDays = 0;
      }
      
      activeDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() - 1);
      consecutiveDays++;
      daysAdded++;
    }
    
    // Distribute problems across active days
    const dateAssignments = {};
    let problemIndex = 0;
    
    for (const date of activeDates) {
      if (problemIndex >= totalProblems) break;
      
      // Random problems per day: 2-6, weighted towards 3-5
      const weights = [1, 3, 5, 5, 3, 1]; // for 2,3,4,5,6 problems
      const randomWeight = Math.random() * weights.reduce((a, b) => a + b, 0);
      let problemsPerDay = 2;
      let cumulative = 0;
      
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (randomWeight <= cumulative) {
          problemsPerDay = i + 2;
          break;
        }
      }
      
      // Don't exceed remaining problems
      problemsPerDay = Math.min(problemsPerDay, totalProblems - problemIndex);
      
      const dateStr = date.toISOString().split('T')[0];
      
      for (let i = 0; i < problemsPerDay && problemIndex < totalProblems; i++) {
        dateAssignments[solvedProblems[problemIndex].number] = dateStr;
        problemIndex++;
      }
    }
    
    return dateAssignments;
  };

  // ============================================
  // MONTHLY ANALYTICS
  // ============================================
  
  const getMonthlyStats = (problems, solvedDates) => {
    const monthlyData = {};
    
    problems.forEach(problem => {
      if (problem.status === 'Done' && solvedDates[problem.number]) {
        const date = new Date(solvedDates[problem.number]);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[yearMonth]) {
          monthlyData[yearMonth] = {
            count: 0,
            year: date.getFullYear(),
            month: date.getMonth(),
            problems: []
          };
        }
        
        monthlyData[yearMonth].count++;
        monthlyData[yearMonth].problems.push(problem);
      }
    });
    
    return monthlyData;
  };

  const getCurrentMonthStats = (monthlyData) => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return monthlyData[currentYearMonth] || { count: 0, problems: [] };
  };

  const getBestMonth = (monthlyData) => {
    let bestMonth = null;
    let maxCount = 0;
    
    Object.entries(monthlyData).forEach(([yearMonth, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        bestMonth = { yearMonth, ...data };
      }
    });
    
    return bestMonth;
  };

  const getLast6Months = (monthlyData) => {
    const now = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      months.push({
        yearMonth,
        monthName,
        count: monthlyData[yearMonth]?.count || 0
      });
    }
    
    return months;
  };

  // ============================================
  // HEATMAP & STREAK CALCULATION
  // ============================================
  
  const calculateHeatmapAndStreak = (problems, solvedDates) => {
    const dateCounts = {};
    
    problems.forEach(problem => {
      if (problem.status === 'Done' && solvedDates[problem.number]) {
        const dateStr = solvedDates[problem.number];
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    });
    
    // Calculate current streak
    const today = new Date();
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dateCounts[dateStr]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Calculate max streak
    const sortedDates = Object.keys(dateCounts).sort();
    let maxStreak = 0;
    let tempStreak = 0;
    let prevDate = null;
    
    sortedDates.forEach(dateStr => {
      const currentDate = new Date(dateStr);
      
      if (prevDate) {
        const diffDays = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      
      prevDate = currentDate;
    });
    
    maxStreak = Math.max(maxStreak, tempStreak);
    
    return {
      dateCounts,
      activeDays: Object.keys(dateCounts).length,
      currentStreak,
      maxStreak
    };
  };

  // ============================================
  // DATA LAYER - SAFE MERGE SYSTEM
  // ============================================
  
  const getAllProblems = () => {
    const problemsMap = new Map();
    const deletedSet = new Set(state.deletedProblems || []);

    // Insert solvedProblems
    solvedProblems.forEach(p => {
      if (!deletedSet.has(p.number)) {
        problemsMap.set(p.number, {
          ...p,
          pattern: normalizePattern(p.pattern),
          userDifficulty: p.userDifficulty || p.difficulty,
          status: 'Done',
          isBase: true,
          type: 'Solved',
          autoDetected: false
        });
      }
    });

    // Insert targetProblems with auto-detection
    targetProblems.forEach(p => {
      if (!deletedSet.has(p.number) && !problemsMap.has(p.number)) {
        const hasPattern = p.pattern && p.pattern.trim() !== '';
        const finalPattern = hasPattern ? normalizePattern(p.pattern) : detectPattern(p.title);
        
        problemsMap.set(p.number, {
          ...p,
          pattern: finalPattern,
          userDifficulty: p.userDifficulty || p.difficulty,
          status: 'Not Started',
          isBase: true,
          type: 'Target',
          autoDetected: !hasPattern
        });
      }
    });

    // Insert customProblems
    state.customProblems.forEach(p => {
      if (!deletedSet.has(p.number) && !problemsMap.has(p.number)) {
        problemsMap.set(p.number, {
          ...p,
          pattern: normalizePattern(p.pattern),
          userDifficulty: p.userDifficulty || p.difficulty,
          isCustom: true,
          autoDetected: p.autoDetected || false
        });
      }
    });

    // Apply status overrides
    problemsMap.forEach((problem, number) => {
      if (state.statusOverrides[number]) {
        problem.status = state.statusOverrides[number];
      }
    });

    // Apply userDifficulty overrides
    problemsMap.forEach((problem, number) => {
      if (state.userDifficultyOverrides && state.userDifficultyOverrides[number]) {
        problem.userDifficulty = state.userDifficultyOverrides[number];
      }
    });

    return Array.from(problemsMap.values()).sort((a, b) => a.number - b.number);
  };

  const allProblems = getAllProblems();

  // ============================================
  // HISTORICAL DATE GENERATION (ONE-TIME)
  // ============================================
  
  useEffect(() => {
    if (!state.historicalDatesGenerated) {
      const solvedProblemsWithoutDates = allProblems.filter(
        p => p.status === 'Done' && !state.solvedDates[p.number]
      );
      
      if (solvedProblemsWithoutDates.length > 0) {
        const historicalDates = generateHistoricalDates(solvedProblemsWithoutDates);
        
        setState(prev => ({
          ...prev,
          solvedDates: {
            ...prev.solvedDates,
            ...historicalDates
          },
          historicalDatesGenerated: true
        }));
      }
    }
  }, []);

  // ============================================
  // CALCULATE ANALYTICS
  // ============================================
  
  const heatmapData = calculateHeatmapAndStreak(allProblems, state.solvedDates);
  const monthlyData = getMonthlyStats(allProblems, state.solvedDates);
  const currentMonthStats = getCurrentMonthStats(monthlyData);
  const bestMonth = getBestMonth(monthlyData);
  const last6Months = getLast6Months(monthlyData);
  const maxMonthlyCount = Math.max(...last6Months.map(m => m.count), 1);

  // ============================================
  // DUPLICATE PREVENTION & VALIDATION
  // ============================================
  
  const problemExists = (number) => {
    return allProblems.some(p => p.number === number);
  };

  const validateDataset = () => {
    const numbers = allProblems.map(p => p.number);
    const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    return duplicates.length === 0;
  };

  // ============================================
  // PASSWORD VERIFICATION
  // ============================================
  
  const verifyPassword = (action) => {
    const password = prompt(`🔒 Enter password to ${action}:`);
    if (password === ADMIN_PASSWORD) {
      return true;
    } else if (password !== null) {
      showNotification('❌ Incorrect password', 'error');
    }
    return false;
  };

  // ============================================
  // NOTIFICATION SYSTEM
  // ============================================
  
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ============================================
  // SMART ADD PROBLEM HANDLER
  // ============================================
  
  const handleAddProblem = (e) => {
    e.preventDefault();
    
    // Password verification
    if (!verifyPassword('add this problem')) {
      return;
    }
    
    // Validation
    if (!formData.number || !formData.title || !formData.link) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const problemNumber = parseInt(formData.number);
    
    if (problemNumber <= 0 || isNaN(problemNumber)) {
      showNotification('Problem number must be a positive integer', 'error');
      return;
    }

    // Duplicate check
    if (problemExists(problemNumber)) {
      showNotification(`⚠️ Problem #${problemNumber} already exists!`, 'error');
      
      const tableRow = document.querySelector(`tr[data-problem-number="${problemNumber}"]`);
      if (tableRow) {
        tableRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tableRow.classList.add('highlight-row');
        setTimeout(() => tableRow.classList.remove('highlight-row'), 2000);
      }
      return;
    }

    // Auto-detect pattern if not provided
    const hasPattern = formData.pattern && formData.pattern.trim() !== '';
    const detectedPattern = hasPattern ? formData.pattern : detectPattern(formData.title);

    const newProblem = {
      number: problemNumber,
      title: formData.title,
      difficulty: formData.difficulty,
      userDifficulty: formData.difficulty,
      pattern: detectedPattern,
      link: formData.link || `https://leetcode.com/problems/${problemNumber}/`,
      status: formData.type === 'Solved' ? 'Done' : 'Not Started',
      type: formData.type,
      autoDetected: !hasPattern
    };

    setState(prev => {
      const newState = {
        ...prev,
        customProblems: [...prev.customProblems, newProblem]
      };
      
      // Auto-assign today's date if problem is marked as Solved
      if (formData.type === 'Solved') {
        const today = new Date().toISOString().split('T')[0];
        newState.solvedDates = {
          ...prev.solvedDates,
          [problemNumber]: today
        };
      }
      
      return newState;
    });

    showNotification(`✓ Problem #${problemNumber} added successfully!`, 'success');
    setShowModal(false);
    setFormData({
      number: '',
      title: '',
      difficulty: 'Medium',
      type: 'Solved',
      pattern: '',
      link: ''
    });
  };

  // ============================================
  // OTHER HANDLERS
  // ============================================
  
  const handleStatusChange = (number, newStatus) => {
    if (!verifyPassword('change status')) {
      return;
    }
    
    setState(prev => {
      const newState = {
        ...prev,
        statusOverrides: {
          ...prev.statusOverrides,
          [number]: newStatus
        }
      };
      
      // Auto-assign date when marking as Done
      if (newStatus === 'Done' && !prev.solvedDates[number]) {
        const today = new Date().toISOString().split('T')[0];
        newState.solvedDates = {
          ...prev.solvedDates,
          [number]: today
        };
      }
      
      // Remove date when unmarking as Done
      if (newStatus !== 'Done' && prev.solvedDates[number]) {
        const { [number]: removed, ...remainingDates } = prev.solvedDates;
        newState.solvedDates = remainingDates;
      }
      
      return newState;
    });
  };

  const handleUserDifficultyChange = (number, newDifficulty) => {
    if (!verifyPassword('change difficulty')) {
      return;
    }
    
    setState(prev => ({
      ...prev,
      userDifficultyOverrides: {
        ...(prev.userDifficultyOverrides || {}),
        [number]: newDifficulty
      }
    }));
  };

  const handleDelete = (number, isCustom) => {
    if (!verifyPassword('delete this problem')) {
      return;
    }
    
    if (confirm('Are you sure you want to delete this problem?')) {
      if (isCustom) {
        setState(prev => ({
          ...prev,
          customProblems: prev.customProblems.filter(p => p.number !== number)
        }));
      } else {
        setState(prev => ({
          ...prev,
          deletedProblems: [...(prev.deletedProblems || []), number]
        }));
      }
      showNotification('Problem deleted', 'success');
    }
  };

  // ============================================
  // DYNAMIC ANALYTICS CALCULATIONS
  // ============================================
  
  const totalSolved = allProblems.filter(p => p.status === 'Done').length;
  const totalProblems = allProblems.length;
  const remaining = Math.max(200 - totalSolved, 0);
  const progressPercentage = Math.min(Math.round((totalSolved / 200) * 100), 100);

  // LeetCode Difficulty distribution
  const easyCount = allProblems.filter(p => p.difficulty === 'Easy' && p.status === 'Done').length;
  const mediumCount = allProblems.filter(p => p.difficulty === 'Medium' && p.status === 'Done').length;
  const hardCount = allProblems.filter(p => p.difficulty === 'Hard' && p.status === 'Done').length;
  
  const totalEasy = allProblems.filter(p => p.difficulty === 'Easy').length;
  const totalMedium = allProblems.filter(p => p.difficulty === 'Medium').length;
  const totalHard = allProblems.filter(p => p.difficulty === 'Hard').length;

  const easyPercent = totalEasy > 0 ? Math.round((easyCount / totalEasy) * 100) : 0;
  const mediumPercent = totalMedium > 0 ? Math.round((mediumCount / totalMedium) * 100) : 0;
  const hardPercent = totalHard > 0 ? Math.round((hardCount / totalHard) * 100) : 0;

  // User Difficulty distribution
  const userEasyCount = allProblems.filter(p => p.userDifficulty === 'Easy' && p.status === 'Done').length;
  const userMediumCount = allProblems.filter(p => p.userDifficulty === 'Medium' && p.status === 'Done').length;
  const userHardCount = allProblems.filter(p => p.userDifficulty === 'Hard' && p.status === 'Done').length;
  
  const totalUserEasy = allProblems.filter(p => p.userDifficulty === 'Easy').length;
  const totalUserMedium = allProblems.filter(p => p.userDifficulty === 'Medium').length;
  const totalUserHard = allProblems.filter(p => p.userDifficulty === 'Hard').length;

  const userEasyPercent = totalUserEasy > 0 ? Math.round((userEasyCount / totalUserEasy) * 100) : 0;
  const userMediumPercent = totalUserMedium > 0 ? Math.round((userMediumCount / totalUserMedium) * 100) : 0;
  const userHardPercent = totalUserHard > 0 ? Math.round((userHardCount / totalUserHard) * 100) : 0;

  // FIXED: Pattern Mastery - Calculate from ALL problems (solved + target)
  const patternStats = {};
  allProblems.forEach(p => {
    if (!patternStats[p.pattern]) {
      patternStats[p.pattern] = { total: 0, solved: 0 };
    }
    patternStats[p.pattern].total++;
    if (p.status === 'Done') {
      patternStats[p.pattern].solved++;
    }
  });

  const patternArray = Object.entries(patternStats)
    .map(([pattern, stats]) => ({
      pattern,
      ...stats,
      percentage: stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0
    }))
    .sort((a, b) => {
      // Sort by percentage descending, then by solved count descending
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return b.solved - a.solved;
    });

  const getPatternColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 50) return 'warning';
    return 'danger';
  };

  // Weakness detection
  const hardCoverage = totalHard > 0 ? (hardCount / totalHard) * 100 : 0;
  const weakPatterns = patternArray.filter(p => p.percentage < 50 && p.total > 0);

  // Filters
  const patterns = ['All', ...new Set(allProblems.map(p => p.pattern))].sort();

  const filteredProblems = allProblems.filter(problem => {
    const matchesSearch = 
      problem.number.toString().includes(searchTerm) ||
      problem.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDifficulty = 
      difficultyFilter === 'All' || problem.difficulty === difficultyFilter;
    
    const matchesPattern = 
      patternFilter === 'All' || problem.pattern === patternFilter;
    
    const matchesStatus = 
      statusFilter === 'All' || problem.status === statusFilter;

    return matchesSearch && matchesDifficulty && matchesPattern && matchesStatus;
  });

  // ============================================
  // EFFECTS
  // ============================================
  
  useEffect(() => {
    localStorage.setItem('priyanshu-leetcode-state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="app">
      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>Priyanshu Gupta</h1>
            <p className="subtitle">Competitive Programming Intelligence Engine</p>
          </div>
          <div className="header-actions">
            <a 
              href="https://leetcode.com/u/priyanshuguptacoder/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-profile"
            >
              <span>LeetCode Profile</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </a>
            <button 
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{totalSolved}</div>
              <div className="stat-label">Problems Solved</div>
            </div>
          </div>
          <div className="stat-card stat-secondary">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{remaining}</div>
              <div className="stat-label">Remaining to 200</div>
            </div>
          </div>
          <div className="stat-card stat-accent">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <div className="stat-value">{progressPercentage}%</div>
              <div className="stat-label">Completion Rate</div>
            </div>
          </div>
          <div className="stat-card stat-info">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <div className="stat-value">{totalProblems}</div>
              <div className="stat-label">Total Problems</div>
            </div>
          </div>
        </div>

        {/* Streak & Monthly Stats */}
        <div className="streak-monthly-grid">
          <div className="streak-card">
            <h3 className="card-title">🔥 Streak Stats</h3>
            <div className="streak-stats">
              <div className="streak-item">
                <div className="streak-value">{heatmapData.currentStreak}</div>
                <div className="streak-label">Current Streak</div>
              </div>
              <div className="streak-divider"></div>
              <div className="streak-item">
                <div className="streak-value">{heatmapData.maxStreak}</div>
                <div className="streak-label">Max Streak</div>
              </div>
              <div className="streak-divider"></div>
              <div className="streak-item">
                <div className="streak-value">{heatmapData.activeDays}</div>
                <div className="streak-label">Active Days</div>
              </div>
            </div>
          </div>

          <div className="monthly-card">
            <h3 className="card-title">📅 Monthly Progress</h3>
            <div className="monthly-header">
              <div className="current-month">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              {bestMonth && (
                <div className="best-month-badge">
                  🏆 Best: {new Date(bestMonth.year, bestMonth.month).toLocaleDateString('en-US', { month: 'short' })} ({bestMonth.count})
                </div>
              )}
            </div>
            <div className="monthly-progress">
              <div className="monthly-count">
                <span className="monthly-value">{currentMonthStats.count}</span>
                <span className="monthly-separator">/</span>
                <span className="monthly-target">{state.monthlyTarget}</span>
              </div>
              <div className="monthly-label">Problems Solved</div>
            </div>
            <div className="monthly-bar-wrapper">
              <div className="monthly-bar-track">
                <div 
                  className="monthly-bar-fill" 
                  style={{ width: `${Math.min((currentMonthStats.count / state.monthlyTarget) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="monthly-percent">
                {Math.round((currentMonthStats.count / state.monthlyTarget) * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Last 6 Months Chart */}
        <div className="months-chart-card">
          <h3 className="card-title">Last 6 Months Activity</h3>
          <div className="months-chart">
            {last6Months.map(month => (
              <div key={month.yearMonth} className="month-bar-container">
                <div className="month-bar-wrapper">
                  <div 
                    className="month-bar" 
                    style={{ height: `${(month.count / maxMonthlyCount) * 100}%` }}
                    title={`${month.count} problems`}
                  >
                    <span className="month-bar-value">{month.count}</span>
                  </div>
                </div>
                <div className="month-label">{month.monthName}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Section */}
        <div className="progress-card">
          <div className="progress-header">
            <div>
              <h2>Mission 200 Progress</h2>
              <p className="progress-subtitle">{totalSolved} / 200 problems completed</p>
            </div>
            <button className="btn-add-problem" onClick={() => setShowModal(true)}>
              <span>+</span> Add Problem
            </button>
          </div>
          <div className="progress-bar-wrapper">
            <div className="progress-bar-track">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progressPercentage}%` }}
              >
                <span className="progress-bar-text">{progressPercentage}%</span>
              </div>
            </div>
          </div>
          {totalSolved >= 200 && (
            <div className="mission-badge">
              🎉 Mission 200 Completed!
            </div>
          )}
        </div>

        {/* Analytics Grid */}
        <div className="analytics-grid">
          {/* LeetCode Difficulty Distribution */}
          <div className="analytics-card">
            <h3 className="card-title">LeetCode Difficulty</h3>
            <div className="difficulty-stats">
              <div className="difficulty-item">
                <div className="difficulty-header">
                  <span className="difficulty-badge difficulty-easy">Easy</span>
                  <span className="difficulty-count">{easyCount} / {totalEasy}</span>
                </div>
                <div className="difficulty-bar">
                  <div className="difficulty-bar-fill difficulty-easy" style={{ width: `${easyPercent}%` }}></div>
                </div>
                <div className="difficulty-percent">{easyPercent}%</div>
              </div>
              <div className="difficulty-item">
                <div className="difficulty-header">
                  <span className="difficulty-badge difficulty-medium">Medium</span>
                  <span className="difficulty-count">{mediumCount} / {totalMedium}</span>
                </div>
                <div className="difficulty-bar">
                  <div className="difficulty-bar-fill difficulty-medium" style={{ width: `${mediumPercent}%` }}></div>
                </div>
                <div className="difficulty-percent">{mediumPercent}%</div>
              </div>
              <div className="difficulty-item">
                <div className="difficulty-header">
                  <span className="difficulty-badge difficulty-hard">Hard</span>
                  <span className="difficulty-count">{hardCount} / {totalHard}</span>
                </div>
                <div className="difficulty-bar">
                  <div className="difficulty-bar-fill difficulty-hard" style={{ width: `${hardPercent}%` }}></div>
                </div>
                <div className="difficulty-percent">{hardPercent}%</div>
              </div>
            </div>
            {hardCoverage < 10 && (
              <div className="alert alert-warning">
                ⚠️ Hard problem coverage is low ({hardCoverage.toFixed(0)}%)
              </div>
            )}
          </div>

          {/* User Difficulty Distribution */}
          <div className="analytics-card">
            <h3 className="card-title">User Difficulty (Your Experience)</h3>
            <div className="difficulty-stats">
              <div className="difficulty-item">
                <div className="difficulty-header">
                  <span className="difficulty-badge difficulty-easy">Easy</span>
                  <span className="difficulty-count">{userEasyCount} / {totalUserEasy}</span>
                </div>
                <div className="difficulty-bar">
                  <div className="difficulty-bar-fill difficulty-easy" style={{ width: `${userEasyPercent}%` }}></div>
                </div>
                <div className="difficulty-percent">{userEasyPercent}%</div>
              </div>
              <div className="difficulty-item">
                <div className="difficulty-header">
                  <span className="difficulty-badge difficulty-medium">Medium</span>
                  <span className="difficulty-count">{userMediumCount} / {totalUserMedium}</span>
                </div>
                <div className="difficulty-bar">
                  <div className="difficulty-bar-fill difficulty-medium" style={{ width: `${userMediumPercent}%` }}></div>
                </div>
                <div className="difficulty-percent">{userMediumPercent}%</div>
              </div>
              <div className="difficulty-item">
                <div className="difficulty-header">
                  <span className="difficulty-badge difficulty-hard">Hard</span>
                  <span className="difficulty-count">{userHardCount} / {totalUserHard}</span>
                </div>
                <div className="difficulty-bar">
                  <div className="difficulty-bar-fill difficulty-hard" style={{ width: `${userHardPercent}%` }}></div>
                </div>
                <div className="difficulty-percent">{userHardPercent}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Problem # or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Difficulty</label>
              <select 
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="filter-select"
              >
                <option>All</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Pattern</label>
              <select 
                value={patternFilter}
                onChange={(e) => setPatternFilter(e.target.value)}
                className="filter-select"
              >
                {patterns.map(pattern => (
                  <option key={pattern}>{pattern}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option>All</option>
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-header">
            <h3>Problem List</h3>
            <span className="table-count">{filteredProblems.length} problems</span>
          </div>
          <div className="table-wrapper">
            <table className="problems-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>User Difficulty</th>
                  <th>Pattern</th>
                  <th>Link</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.length > 0 ? (
                  filteredProblems.map(problem => (
                    <tr key={problem.number} data-problem-number={problem.number}>
                      <td className="problem-number">{problem.number}</td>
                      <td className="problem-title">{problem.title}</td>
                      <td>
                        <span className={`badge badge-${problem.difficulty.toLowerCase()}`}>
                          {problem.difficulty}
                        </span>
                      </td>
                      <td>
                        <select
                          className={`difficulty-select difficulty-${problem.userDifficulty.toLowerCase()}`}
                          value={problem.userDifficulty}
                          onChange={(e) => handleUserDifficultyChange(problem.number, e.target.value)}
                        >
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                      </td>
                      <td>
                        <span className="badge badge-pattern">
                          {problem.pattern}
                        </span>
                      </td>
                      <td>
                        <a 
                          href={problem.link || `https://leetcode.com/problems/${problem.number}/`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="problem-link-btn"
                          title="Open on LeetCode"
                        >
                          🔗 Open
                        </a>
                      </td>
                      <td>
                        <select
                          className={`status-select status-${problem.status.toLowerCase().replace(' ', '-')}`}
                          value={problem.status}
                          onChange={(e) => handleStatusChange(problem.number, e.target.value)}
                        >
                          <option>Not Started</option>
                          <option>In Progress</option>
                          <option>Done</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(problem.number, problem.isCustom)}
                          title="Delete problem"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-state">
                      <div className="empty-icon">🔍</div>
                      <p>No problems found</p>
                      <small>Try adjusting your filters</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Problem</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddProblem}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Problem Number *</label>
                    <input
                      type="number"
                      value={formData.number}
                      onChange={(e) => setFormData({...formData, number: e.target.value})}
                      placeholder="e.g., 1"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="form-input"
                    >
                      <option>Solved</option>
                      <option>Target</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g., Two Sum"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>LeetCode Link *</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({...formData, link: e.target.value})}
                    placeholder="https://leetcode.com/problems/two-sum/"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Difficulty *</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                      className="form-input"
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Pattern (optional)</label>
                    <input
                      type="text"
                      value={formData.pattern}
                      onChange={(e) => setFormData({...formData, pattern: e.target.value})}
                      placeholder="Auto-detected from title"
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-hint">
                  💡 Pattern will be automatically detected from the title if not provided
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Problem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
