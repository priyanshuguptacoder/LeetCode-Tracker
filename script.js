const { useState, useEffect, useRef } = React;

function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem('priyanshu-leetcode-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Data sanitization - ensure all required fields exist
        return {
          statusOverrides: parsed.statusOverrides || {},
          userDifficultyOverrides: parsed.userDifficultyOverrides || {},
          customProblems: Array.isArray(parsed.customProblems) ? parsed.customProblems : [],
          deletedProblems: Array.isArray(parsed.deletedProblems) ? parsed.deletedProblems : [],
          solvedDates: parsed.solvedDates || {},
          revisionFlags: parsed.revisionFlags || {},
          solveTimes: parsed.solveTimes || {},
          historicalDatesGenerated: parsed.historicalDatesGenerated || false,
          monthlyTarget: parsed.monthlyTarget || 30,
          todayCount: parsed.todayCount || 0,
          weeklyCount: parsed.weeklyCount || 0,
          lastUpdate: parsed.lastUpdate || new Date().toDateString()
        };
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem('priyanshu-leetcode-state');
    }
    
    // Default state
    return {
      statusOverrides: {},
      userDifficultyOverrides: {},
      customProblems: [],
      deletedProblems: [],
      solvedDates: {},
      revisionFlags: {},
      solveTimes: {},
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
    try {
      // Guard against invalid inputs
      if (!Array.isArray(problems)) {
        console.error('getMonthlyStats: problems is not an array');
        return {};
      }
      
      if (!solvedDates || typeof solvedDates !== 'object') {
        console.error('getMonthlyStats: solvedDates is not an object');
        return {};
      }
      
      const monthlyData = {};
      
      problems.forEach(problem => {
        // Validate problem object
        if (!problem || typeof problem !== 'object') return;
        if (!problem.number) return;
        if (problem.status !== 'Done') return;
        
        // Check if solved date exists
        const dateStr = solvedDates[problem.number];
        if (!dateStr) return;
        
        // Validate date
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for problem ${problem.number}: ${dateStr}`);
          return;
        }
        
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
      });
      
      return monthlyData;
    } catch (error) {
      console.error('Error in getMonthlyStats:', error);
      return {};
    }
  };

  const getCurrentMonthStats = (monthlyData) => {
    try {
      if (!monthlyData || typeof monthlyData !== 'object') {
        return { count: 0, problems: [] };
      }
      
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return monthlyData[currentYearMonth] || { count: 0, problems: [] };
    } catch (error) {
      console.error('Error in getCurrentMonthStats:', error);
      return { count: 0, problems: [] };
    }
  };

  const getBestMonth = (monthlyData) => {
    try {
      if (!monthlyData || typeof monthlyData !== 'object') {
        return null;
      }
      
      let bestMonth = null;
      let maxCount = 0;
      
      Object.entries(monthlyData).forEach(([yearMonth, data]) => {
        if (data && data.count > maxCount) {
          maxCount = data.count;
          bestMonth = { yearMonth, ...data };
        }
      });
      
      return bestMonth;
    } catch (error) {
      console.error('Error in getBestMonth:', error);
      return null;
    }
  };

  const getLast6Months = (monthlyData) => {
    try {
      if (!monthlyData || typeof monthlyData !== 'object') {
        monthlyData = {};
      }
      
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
    } catch (error) {
      console.error('Error in getLast6Months:', error);
      return [];
    }
  };

  // ============================================
  // HEATMAP & STREAK CALCULATION
  // ============================================
  
  const calculateHeatmapAndStreak = (problems, solvedDates) => {
    if (!problems || !solvedDates) {
      return {
        dateCounts: {},
        activeDays: 0,
        currentStreak: 0,
        maxStreak: 0
      };
    }
    
    const dateCounts = {};
    
    problems.forEach(problem => {
      if (problem && problem.status === 'Done' && problem.number && solvedDates[problem.number]) {
        const dateStr = solvedDates[problem.number];
        if (dateStr) {
          dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
        }
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
      if (!dateStr) return;
      
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
  // ADVANCED ANALYTICS
  // ============================================
  
  // 1️⃣ CONSISTENCY SCORE
  const calculateConsistencyScore = (problems, solvedDates) => {
    if (!problems || !solvedDates) {
      return { 
        score: 0, 
        status: '🔴 Low', 
        label: 'Low',
        totalDaysTracked: 0,
        activeDays: 0,
        averageProblemsPerActiveDay: 0
      };
    }
    
    const dates = Object.values(solvedDates).filter(d => d);
    if (dates.length === 0) {
      return { 
        score: 0, 
        status: '🔴 Low', 
        label: 'Low',
        totalDaysTracked: 0,
        activeDays: 0,
        averageProblemsPerActiveDay: 0
      };
    }
    
    const sortedDates = dates.sort();
    const firstDate = new Date(sortedDates[0]);
    const today = new Date();
    const totalDaysTracked = Math.max(1, Math.ceil((today - firstDate) / (1000 * 60 * 60 * 24)));
    
    const activeDays = new Set(dates).size;
    const totalSolved = problems.filter(p => p && p.status === 'Done').length;
    const averageProblemsPerActiveDay = activeDays > 0 ? totalSolved / activeDays : 0;
    
    let consistency = (activeDays / totalDaysTracked) * 100;
    
    // Boost if solving 3+ problems per active day
    if (averageProblemsPerActiveDay >= 3) {
      consistency = Math.min(100, consistency * 1.1);
    }
    
    let status, label;
    if (consistency < 40) {
      status = '🔴 Low';
      label = 'Low';
    } else if (consistency < 70) {
      status = '🟡 Improving';
      label = 'Improving';
    } else {
      status = '🟢 Strong Discipline';
      label = 'Strong Discipline';
    }
    
    return {
      score: Math.round(consistency),
      status,
      label,
      totalDaysTracked,
      activeDays,
      averageProblemsPerActiveDay: averageProblemsPerActiveDay.toFixed(1)
    };
  };

  // 2️⃣ GOAL MILESTONES
  const calculateMilestones = (totalSolved) => {
    const milestones = [
      { value: 150, label: '150 Problems', icon: '🥉' },
      { value: 200, label: '200 Problems', icon: '🥈' },
      { value: 250, label: '250 Problems', icon: '🥇' },
      { value: 300, label: '300 Problems', icon: '🏆' }
    ];
    
    const unlocked = milestones.filter(m => totalSolved >= m.value);
    const nextMilestone = milestones.find(m => totalSolved < m.value);
    const progressToNext = nextMilestone 
      ? ((totalSolved / nextMilestone.value) * 100).toFixed(1)
      : 100;
    
    return { unlocked, nextMilestone, progressToNext };
  };

  // 3️⃣ WEEKLY PERFORMANCE
  const calculateWeeklyPerformance = (problems, solvedDates) => {
    if (!problems || !solvedDates) {
      return {
        thisWeek: 0,
        lastWeek: 0,
        change: 0,
        trend: '➡️'
      };
    }
    
    const getISOWeekStart = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      return new Date(d.setDate(diff));
    };
    
    const today = new Date();
    const thisWeekStart = getISOWeekStart(today);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    let thisWeekCount = 0;
    let lastWeekCount = 0;
    
    problems.forEach(problem => {
      if (problem && problem.status === 'Done' && problem.number && solvedDates[problem.number]) {
        const solvedDate = new Date(solvedDates[problem.number]);
        
        if (solvedDate >= thisWeekStart) {
          thisWeekCount++;
        } else if (solvedDate >= lastWeekStart && solvedDate < thisWeekStart) {
          lastWeekCount++;
        }
      }
    });
    
    const change = lastWeekCount > 0 
      ? (((thisWeekCount - lastWeekCount) / lastWeekCount) * 100).toFixed(1)
      : thisWeekCount > 0 ? 100 : 0;
    
    return {
      thisWeek: thisWeekCount,
      lastWeek: lastWeekCount,
      change: parseFloat(change),
      trend: change > 0 ? '📈' : change < 0 ? '📉' : '➡️'
    };
  };

  // 4️⃣ DAILY AVERAGE TREND
  const calculateDailyAverage = (problems, solvedDates) => {
    if (!problems || !solvedDates) {
      return {
        overallAvg: 0,
        last7Avg: 0,
        prev7Avg: 0,
        trend: 'Stable',
        arrow: '➡️'
      };
    }
    
    const activeDays = new Set(Object.values(solvedDates).filter(d => d)).size;
    const totalSolved = problems.filter(p => p && p.status === 'Done').length;
    const overallAvg = activeDays > 0 ? (totalSolved / activeDays).toFixed(2) : 0;
    
    // Last 7 days
    const today = new Date();
    const last7Start = new Date(today);
    last7Start.setDate(last7Start.getDate() - 7);
    const prev7Start = new Date(last7Start);
    prev7Start.setDate(prev7Start.getDate() - 7);
    
    let last7Count = 0;
    let prev7Count = 0;
    const last7Days = new Set();
    const prev7Days = new Set();
    
    problems.forEach(problem => {
      if (problem && problem.status === 'Done' && problem.number && solvedDates[problem.number]) {
        const solvedDate = new Date(solvedDates[problem.number]);
        
        if (solvedDate >= last7Start) {
          last7Count++;
          last7Days.add(solvedDates[problem.number]);
        } else if (solvedDate >= prev7Start && solvedDate < last7Start) {
          prev7Count++;
          prev7Days.add(solvedDates[problem.number]);
        }
      }
    });
    
    const last7Avg = last7Days.size > 0 ? (last7Count / last7Days.size).toFixed(2) : 0;
    const prev7Avg = prev7Days.size > 0 ? (prev7Count / prev7Days.size).toFixed(2) : 0;
    
    let trend = 'Stable';
    if (last7Avg > prev7Avg) trend = 'Improving';
    else if (last7Avg < prev7Avg) trend = 'Declining';
    
    return {
      overallAvg,
      last7Avg,
      prev7Avg,
      trend,
      arrow: trend === 'Improving' ? '📈' : trend === 'Declining' ? '📉' : '➡️'
    };
  };

  // 5️⃣ REVISION TRACKING
  const getRevisionStats = (problems) => {
    if (!problems) {
      return {
        needsRevisionCount: 0,
        needsRevisionProblems: [],
        recentlyRevised: []
      };
    }
    
    const needsRevision = problems.filter(p => 
      p && p.status === 'Done' && state.revisionFlags && state.revisionFlags[p.number]?.needsRevision
    );
    
    const recentlyRevised = problems
      .filter(p => p && state.revisionFlags && state.revisionFlags[p.number]?.lastRevisedDate)
      .sort((a, b) => {
        const dateA = state.revisionFlags[a.number]?.lastRevisedDate || '';
        const dateB = state.revisionFlags[b.number]?.lastRevisedDate || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 5);
    
    return {
      needsRevisionCount: needsRevision.length,
      needsRevisionProblems: needsRevision,
      recentlyRevised
    };
  };

  // 6️⃣ STRONGEST DAY
  const calculateStrongestDay = (solvedDates) => {
    if (!solvedDates) {
      return {
        count: 0,
        date: 'N/A'
      };
    }
    
    const dateCounts = {};
    
    Object.values(solvedDates).forEach(dateStr => {
      if (dateStr) {
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    });
    
    let maxCount = 0;
    let bestDate = null;
    
    Object.entries(dateCounts).forEach(([date, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestDate = date;
      }
    });
    
    return {
      count: maxCount,
      date: bestDate ? new Date(bestDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) : 'N/A'
    };
  };

  // 7️⃣ SOLVE TIME TRACKING
  const calculateSolveTimes = (problems, solveTimes) => {
    if (!problems || !solveTimes) {
      return {
        overallAvg: 0,
        easyAvg: 0,
        mediumAvg: 0,
        hardAvg: 0,
        totalTracked: 0
      };
    }
    
    const times = {
      overall: [],
      Easy: [],
      Medium: [],
      Hard: []
    };
    
    problems.forEach(problem => {
      if (problem && problem.status === 'Done' && problem.number && solveTimes[problem.number]) {
        const time = solveTimes[problem.number];
        times.overall.push(time);
        if (problem.difficulty && times[problem.difficulty]) {
          times[problem.difficulty].push(time);
        }
      }
    });
    
    const avg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
    
    return {
      overallAvg: avg(times.overall),
      easyAvg: avg(times.Easy),
      mediumAvg: avg(times.Medium),
      hardAvg: avg(times.Hard),
      totalTracked: times.overall.length
    };
  };

  // 8️⃣ AI-BASED MONTHLY TARGET SUGGESTION
  const calculateAITargetSuggestion = (problems, solvedDates, consistencyScore) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get problems solved in last 1, 2, 3 months
    const getMonthStart = (monthsAgo) => {
      const d = new Date(currentYear, currentMonth - monthsAgo, 1);
      return d;
    };
    
    const last1MonthStart = getMonthStart(1);
    const last2MonthStart = getMonthStart(2);
    const last3MonthStart = getMonthStart(3);
    const currentMonthStart = getMonthStart(0);
    
    let last1MonthCount = 0;
    let last2MonthCount = 0;
    let last3MonthCount = 0;
    let currentMonthCount = 0;
    
    problems.forEach(problem => {
      if (problem.status === 'Done' && solvedDates[problem.number]) {
        const solvedDate = new Date(solvedDates[problem.number]);
        
        if (solvedDate >= currentMonthStart) {
          currentMonthCount++;
        }
        if (solvedDate >= last1MonthStart && solvedDate < currentMonthStart) {
          last1MonthCount++;
        }
        if (solvedDate >= last2MonthStart && solvedDate < last1MonthStart) {
          last2MonthCount++;
        }
        if (solvedDate >= last3MonthStart && solvedDate < last2MonthStart) {
          last3MonthCount++;
        }
      }
    });
    
    // Calculate averages
    const averageLast3Months = Math.round((last1MonthCount + last2MonthCount + last3MonthCount) / 3);
    
    // Current month pace
    const daysIntoMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentPace = daysIntoMonth > 0 ? (currentMonthCount / daysIntoMonth) * daysInMonth : 0;
    
    // Base suggestion (10% increase)
    let suggestedTarget = Math.round(averageLast3Months * 1.10);
    
    // Adjust based on current pace
    if (currentPace > averageLast3Months * 1.2) {
      // Strong pace - increase by 10%
      suggestedTarget = Math.round(suggestedTarget * 1.10);
    } else if (currentPace < averageLast3Months * 0.7) {
      // Weak pace - decrease by 10%
      suggestedTarget = Math.round(suggestedTarget * 0.90);
    }
    
    // Growth mode detection
    const isGrowthTrend = last1MonthCount > last2MonthCount && last2MonthCount > last3MonthCount;
    const isInconsistent = Math.abs(last1MonthCount - last2MonthCount) > 10 || Math.abs(last2MonthCount - last3MonthCount) > 10;
    
    if (isGrowthTrend) {
      // Aggressive growth
      suggestedTarget = Math.round(suggestedTarget * 1.15);
    } else if (isInconsistent) {
      // Stable target
      suggestedTarget = averageLast3Months;
    }
    
    // High consistency bonus
    if (consistencyScore.score > 75) {
      suggestedTarget = Math.round(suggestedTarget * 1.10);
    }
    
    // Round to nearest 5
    suggestedTarget = Math.round(suggestedTarget / 5) * 5;
    
    // Apply constraints
    suggestedTarget = Math.max(20, suggestedTarget);
    suggestedTarget = Math.min(suggestedTarget, Math.round(averageLast3Months * 1.5));
    suggestedTarget = Math.max(suggestedTarget, last1MonthCount);
    
    // Determine growth mode
    let growthMode = 'Balanced';
    if (suggestedTarget >= averageLast3Months * 1.3) {
      growthMode = 'Aggressive';
    } else if (suggestedTarget <= averageLast3Months * 1.05) {
      growthMode = 'Conservative';
    }
    
    return {
      suggestedTarget,
      growthMode,
      last1MonthCount,
      last2MonthCount,
      last3MonthCount,
      averageLast3Months,
      currentMonthCount,
      currentPace: Math.round(currentPace),
      reasoning: `Based on ${averageLast3Months} avg/month over last 3 months`
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
    try {
      // Guard against invalid state
      if (!state || typeof state !== 'object') return;
      if (!Array.isArray(allProblems)) return;
      if (!state.solvedDates || typeof state.solvedDates !== 'object') return;
      if (state.historicalDatesGenerated) return;
      
      const solvedProblemsWithoutDates = allProblems.filter(
        p => p && p.status === 'Done' && p.number && !state.solvedDates[p.number]
      );
      
      if (solvedProblemsWithoutDates.length > 0) {
        const historicalDates = generateHistoricalDates(solvedProblemsWithoutDates);
        
        if (historicalDates && typeof historicalDates === 'object') {
          setState(prev => ({
            ...prev,
            solvedDates: {
              ...(prev.solvedDates || {}),
              ...historicalDates
            },
            historicalDatesGenerated: true
          }));
        }
      }
    } catch (error) {
      console.error('Error in historical date generation:', error);
    }
  }, [state.historicalDatesGenerated, allProblems.length]);

  // ============================================
  // CALCULATE ANALYTICS
  // ============================================
  
  const heatmapData = React.useMemo(
    () => calculateHeatmapAndStreak(allProblems, state.solvedDates || {}),
    [allProblems, state.solvedDates]
  );
  
  const monthlyData = React.useMemo(
    () => getMonthlyStats(allProblems, state.solvedDates || {}),
    [allProblems, state.solvedDates]
  );
  
  const currentMonthStats = React.useMemo(
    () => getCurrentMonthStats(monthlyData),
    [monthlyData]
  );
  
  const bestMonth = React.useMemo(
    () => getBestMonth(monthlyData),
    [monthlyData]
  );
  
  const last6Months = React.useMemo(
    () => getLast6Months(monthlyData),
    [monthlyData]
  );
  
  const maxMonthlyCount = React.useMemo(
    () => Math.max(...last6Months.map(m => m.count || 0), 1),
    [last6Months]
  );

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
    
    // Prompt for solve time when marking as Done
    if (newStatus === 'Done') {
      const time = prompt('Enter solve time in minutes (optional, press Cancel to skip):');
      if (time !== null && time.trim() !== '') {
        const minutes = parseInt(time);
        if (!isNaN(minutes) && minutes > 0) {
          setState(prev => ({
            ...prev,
            solveTimes: {
              ...prev.solveTimes,
              [number]: minutes
            }
          }));
        }
      }
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
      
      // Remove date and revision flag when unmarking as Done
      if (newStatus !== 'Done') {
        if (prev.solvedDates[number]) {
          const { [number]: removed, ...remainingDates } = prev.solvedDates;
          newState.solvedDates = remainingDates;
        }
        
        // Remove revision flag
        if (prev.revisionFlags[number]) {
          const { [number]: removed, ...remainingFlags } = prev.revisionFlags;
          newState.revisionFlags = remainingFlags;
        }
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

  const handleToggleRevision = (number) => {
    if (!verifyPassword('toggle revision flag')) {
      return;
    }
    
    setState(prev => {
      const current = prev.revisionFlags[number] || { needsRevision: false, revisionCount: 0 };
      return {
        ...prev,
        revisionFlags: {
          ...prev.revisionFlags,
          [number]: {
            ...current,
            needsRevision: !current.needsRevision
          }
        }
      };
    });
  };

  const handleMarkRevised = (number) => {
    if (!verifyPassword('mark as revised')) {
      return;
    }
    
    setState(prev => {
      const current = prev.revisionFlags[number] || { needsRevision: false, revisionCount: 0 };
      return {
        ...prev,
        revisionFlags: {
          ...prev.revisionFlags,
          [number]: {
            needsRevision: false,
            revisionCount: current.revisionCount + 1,
            lastRevisedDate: new Date().toISOString().split('T')[0]
          }
        }
      };
    });
    
    showNotification('✓ Marked as revised', 'success');
  };

  const handleSolveTimeInput = (number) => {
    const time = prompt('Enter solve time in minutes (or leave blank to skip):');
    if (time !== null && time.trim() !== '') {
      const minutes = parseInt(time);
      if (!isNaN(minutes) && minutes > 0) {
        setState(prev => ({
          ...prev,
          solveTimes: {
            ...prev.solveTimes,
            [number]: minutes
          }
        }));
      }
    }
  };

  const handleAdoptSuggestedTarget = () => {
    if (!verifyPassword('adopt suggested target')) {
      return;
    }
    
    setState(prev => ({
      ...prev,
      monthlyTarget: aiTargetSuggestion.suggestedTarget
    }));
    
    showNotification(`✓ Monthly target updated to ${aiTargetSuggestion.suggestedTarget}`, 'success');
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Auto-reset search when empty
  useEffect(() => {
    if (searchTerm.trim() === '') {
      // Search is cleared, filtered results will show all
    }
  }, [searchTerm]);

  // ============================================
  // DYNAMIC ANALYTICS CALCULATIONS
  // ============================================
  
  const totalSolved = allProblems.filter(p => p.status === 'Done').length;
  const totalProblems = allProblems.length;
  const remaining = Math.max(200 - totalSolved, 0);
  const progressPercentage = Math.min(Math.round((totalSolved / 200) * 100), 100);

  // Advanced Analytics
  const consistencyScore = calculateConsistencyScore(allProblems, state.solvedDates);
  const milestones = calculateMilestones(totalSolved);
  const weeklyPerformance = calculateWeeklyPerformance(allProblems, state.solvedDates);
  const dailyAverage = calculateDailyAverage(allProblems, state.solvedDates);
  const revisionStats = getRevisionStats(allProblems);
  const strongestDay = calculateStrongestDay(state.solvedDates);
  const solveTimes = calculateSolveTimes(allProblems, state.solveTimes || {});
  const aiTargetSuggestion = React.useMemo(
    () => calculateAITargetSuggestion(allProblems, state.solvedDates, consistencyScore),
    [allProblems.length, state.solvedDates, consistencyScore.score]
  );

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

  const filteredProblems = React.useMemo(() => {
    return allProblems.filter(problem => {
      const matchesSearch = 
        searchTerm.trim() === '' ||
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
  }, [allProblems, searchTerm, difficultyFilter, patternFilter, statusFilter]);

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
  
  try {
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
            
            {/* AI Target Suggestion */}
            <div className="ai-suggestion-section">
              <div className="ai-suggestion-header">
                <span className="ai-icon">🤖</span>
                <span className="ai-title">AI Suggested Target</span>
                <span className={`growth-mode-badge ${aiTargetSuggestion.growthMode.toLowerCase()}`}>
                  {aiTargetSuggestion.growthMode}
                </span>
              </div>
              <div className="ai-suggestion-value">{aiTargetSuggestion.suggestedTarget}</div>
              <div className="ai-suggestion-reason">{aiTargetSuggestion.reasoning}</div>
              <button 
                className="btn-adopt-target"
                onClick={handleAdoptSuggestedTarget}
              >
                Adopt Suggested Target
              </button>
              <div className="ai-tooltip">
                💡 Based on last 3 months average ({aiTargetSuggestion.averageLast3Months}), current pace ({aiTargetSuggestion.currentPace}/month), and consistency score.
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

        {/* Advanced Analytics Grid */}
        <div className="advanced-analytics-grid">
          {/* Consistency Score */}
          <div className="analytics-card consistency-card">
            <h3 className="card-title">🎯 Consistency Score</h3>
            <div className="consistency-content">
              <div className="consistency-score-display">
                <div className="consistency-score">{consistencyScore.score}%</div>
                <div className="consistency-status">{consistencyScore.status}</div>
              </div>
              <div className="consistency-details">
                <div className="consistency-detail-item">
                  <span className="detail-label">Active Days:</span>
                  <span className="detail-value">{consistencyScore.activeDays} / {consistencyScore.totalDaysTracked}</span>
                </div>
                <div className="consistency-detail-item">
                  <span className="detail-label">Avg per Day:</span>
                  <span className="detail-value">{consistencyScore.averageProblemsPerActiveDay}</span>
                </div>
              </div>
              <div className="consistency-tooltip">
                💡 Score = (Active Days / Total Days) × 100. Bonus for 3+ problems/day.
              </div>
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="analytics-card weekly-card">
            <h3 className="card-title">📊 Weekly Performance</h3>
            <div className="weekly-content">
              <div className="weekly-comparison">
                <div className="weekly-item">
                  <div className="weekly-label">This Week</div>
                  <div className="weekly-value">{weeklyPerformance.thisWeek}</div>
                </div>
                <div className="weekly-divider"></div>
                <div className="weekly-item">
                  <div className="weekly-label">Last Week</div>
                  <div className="weekly-value">{weeklyPerformance.lastWeek}</div>
                </div>
              </div>
              <div className="weekly-change">
                <span className="change-icon">{weeklyPerformance.trend}</span>
                <span className="change-value" style={{ color: weeklyPerformance.change > 0 ? 'var(--success)' : weeklyPerformance.change < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {weeklyPerformance.change > 0 ? '+' : ''}{weeklyPerformance.change}%
                </span>
              </div>
            </div>
          </div>

          {/* Daily Average */}
          <div className="analytics-card daily-avg-card">
            <h3 className="card-title">📈 Daily Average</h3>
            <div className="daily-avg-content">
              <div className="daily-avg-main">
                <div className="daily-avg-value">{dailyAverage.overallAvg}</div>
                <div className="daily-avg-label">Problems per Active Day</div>
              </div>
              <div className="daily-avg-trend">
                <div className="trend-item">
                  <span className="trend-label">Last 7 Days:</span>
                  <span className="trend-value">{dailyAverage.last7Avg}</span>
                </div>
                <div className="trend-status">
                  <span className="trend-arrow">{dailyAverage.arrow}</span>
                  <span className="trend-text">{dailyAverage.trend}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strongest Day */}
          <div className="analytics-card strongest-day-card">
            <h3 className="card-title">🔥 Best Day Record</h3>
            <div className="strongest-day-content">
              <div className="strongest-day-count">{strongestDay.count}</div>
              <div className="strongest-day-label">Problems Solved</div>
              <div className="strongest-day-date">{strongestDay.date}</div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="milestones-card">
          <h3 className="card-title">🏆 Goal Milestones</h3>
          <div className="milestones-grid">
            {milestones.unlocked.map(milestone => (
              <div key={milestone.value} className="milestone-badge unlocked">
                <span className="milestone-icon">{milestone.icon}</span>
                <span className="milestone-label">{milestone.label}</span>
                <span className="milestone-status">✓ Unlocked</span>
              </div>
            ))}
            {milestones.nextMilestone && (
              <div className="milestone-badge next">
                <span className="milestone-icon">{milestones.nextMilestone.icon}</span>
                <span className="milestone-label">{milestones.nextMilestone.label}</span>
                <div className="milestone-progress-bar">
                  <div className="milestone-progress-fill" style={{ width: `${milestones.progressToNext}%` }}></div>
                </div>
                <span className="milestone-progress-text">{milestones.progressToNext}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Solve Time Analytics */}
        {solveTimes.totalTracked > 0 && (
          <div className="solve-time-card">
            <h3 className="card-title">⏱️ Solve Time Analytics</h3>
            <div className="solve-time-grid">
              <div className="solve-time-item">
                <div className="solve-time-label">Overall Average</div>
                <div className="solve-time-value">{solveTimes.overallAvg} min</div>
              </div>
              <div className="solve-time-item">
                <div className="solve-time-label">Easy</div>
                <div className="solve-time-value">{solveTimes.easyAvg} min</div>
              </div>
              <div className="solve-time-item">
                <div className="solve-time-label">Medium</div>
                <div className="solve-time-value">{solveTimes.mediumAvg} min</div>
              </div>
              <div className="solve-time-item">
                <div className="solve-time-label">Hard</div>
                <div className="solve-time-value">{solveTimes.hardAvg} min</div>
              </div>
            </div>
            <div className="solve-time-footer">
              Tracked for {solveTimes.totalTracked} problems
            </div>
          </div>
        )}

        {/* Revision Tracking */}
        {revisionStats.needsRevisionCount > 0 && (
          <div className="revision-card">
            <h3 className="card-title">📝 Needs Revision ({revisionStats.needsRevisionCount})</h3>
            <div className="revision-list">
              {revisionStats.needsRevisionProblems.slice(0, 5).map(problem => (
                <div key={problem.number} className="revision-item">
                  <span className="revision-number">#{problem.number}</span>
                  <span className="revision-title">{problem.title}</span>
                  <button 
                    className="btn-revised"
                    onClick={() => handleMarkRevised(problem.number)}
                  >
                    Mark Revised
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Problem # or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-input search-input"
                />
                {searchTerm && (
                  <button 
                    className="search-clear-btn"
                    onClick={handleClearSearch}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
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
                        <div className="action-buttons">
                          {problem.status === 'Done' && (
                            <button 
                              className={`btn-revision ${state.revisionFlags[problem.number]?.needsRevision ? 'active' : ''}`}
                              onClick={() => handleToggleRevision(problem.number)}
                              title={state.revisionFlags[problem.number]?.needsRevision ? 'Remove revision flag' : 'Mark for revision'}
                            >
                              📝
                            </button>
                          )}
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete(problem.number, problem.isCustom)}
                            title="Delete problem"
                          >
                            🗑️
                          </button>
                        </div>
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
  } catch (error) {
    console.error('Render error:', error);
    return (
      <div className="app" style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--danger)' }}>⚠️ Error Loading Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
          Something went wrong. Please refresh the page.
        </p>
        <button 
          onClick={() => {
            localStorage.removeItem('priyanshu-leetcode-state');
            window.location.reload();
          }}
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Clear Data & Reload
        </button>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('root'));
