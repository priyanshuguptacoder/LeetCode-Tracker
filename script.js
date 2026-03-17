const { useState, useEffect, useRef } = React;

function App() {
  // ============================================
  // API DATA FETCHING
  // Backend is the SINGLE SOURCE OF TRUTH for all problem data.
  // solvedDates, streak, activeDays are derived from apiProblems via useMemo.
  // manualStats in localStorage allows manual override of streak/activeDays.
  // ============================================
  
  const [apiProblems, setApiProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // ── DB-backed streak state ────────────────────────────────────────────────
  // Source of truth lives in MongoDB Settings document.
  // Fetched on mount, updated after every createProblem/updateProblem (solved).
  const [dbStreak, setDbStreak] = useState({
    currentStreak: 0,
    maxStreak: 0,
    activeDays: 0,
    lastSolvedDate: null,
    isSetup: false,
  });

  const toLocalDateStr = (date) => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(date));
  };
  const todayLocalStr = toLocalDateStr(new Date());

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date(NaN);
    const [y, m, d] = dateStr.split('-');
    return new Date(y, m - 1, d);
  };

  // Parse "DD-MMM" → local date string "YYYY-MM-DD"
  const MONTH_MAP = {
    Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
    Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'
  };
  const parseDDMMM = (str) => {
    if (!str) return null;
    const [day, mon] = str.split('-');
    if (!MONTH_MAP[mon]) return null;
    const year = new Date().getFullYear();
    return `${year}-${MONTH_MAP[mon]}-${day.padStart(2,'0')}`;
  };

  // ============================================
  // TOPIC MAP — Curated LeetCode tags per problem ID
  // ============================================
  const TOPIC_MAP = {
    1:["Array","Hash Table"],2:["Linked List","Math"],3:["Sliding Window","Hash Table"],5:["Dynamic Programming","String"],
    7:["Math"],8:["String"],9:["Math"],11:["Two Pointers","Greedy"],13:["Math","String"],14:["String"],
    15:["Two Pointers","Sorting"],16:["Two Pointers","Sorting"],17:["Backtracking","String"],18:["Two Pointers","Sorting"],
    19:["Linked List","Two Pointers"],20:["Stack","String"],21:["Linked List"],22:["Backtracking","Dynamic Programming"],
    24:["Linked List"],25:["Linked List"],26:["Array","Two Pointers"],27:["Array","Two Pointers"],
    29:["Math","Bit Manipulation"],30:["Sliding Window","Hash Table","String"],31:["Array","Two Pointers"],
    33:["Binary Search","Array"],34:["Binary Search","Array"],35:["Binary Search"],36:["Matrix","Hash Table"],
    37:["Backtracking","Matrix"],39:["Backtracking","Array"],40:["Backtracking","Array"],42:["Two Pointers","Stack","Dynamic Programming"],
    46:["Backtracking","Array"],48:["Matrix","Array"],49:["Hash Table","String","Sorting"],50:["Math","Recursion"],
    51:["Backtracking"],53:["Dynamic Programming","Array"],54:["Matrix","Array"],56:["Array","Sorting"],
    57:["Array","Sorting"],58:["String"],61:["Linked List"],66:["Array","Math"],69:["Binary Search","Math"],
    70:["Dynamic Programming","Math"],71:["Stack","String"],73:["Matrix","Array"],74:["Binary Search","Matrix"],
    75:["Two Pointers","Array","Sorting"],76:["Sliding Window","Hash Table","String"],77:["Backtracking"],
    78:["Backtracking","Bit Manipulation","Array"],81:["Binary Search","Array"],82:["Linked List"],
    83:["Linked List"],84:["Stack","Array"],85:["Stack","Dynamic Programming","Matrix"],86:["Linked List","Two Pointers"],
    88:["Array","Two Pointers","Sorting"],90:["Backtracking","Array"],92:["Linked List"],118:["Array","Dynamic Programming"],
    121:["Array","Dynamic Programming"],125:["Two Pointers","String"],128:["Array","Hash Table"],131:["Backtracking","Dynamic Programming","String"],
    136:["Bit Manipulation","Array"],137:["Bit Manipulation","Array"],138:["Linked List","Hash Table"],
    141:["Linked List","Two Pointers"],142:["Linked List","Two Pointers"],143:["Linked List"],146:["Design","Hash Table","Linked List"],
    148:["Linked List","Sorting"],150:["Stack","Math"],151:["String","Two Pointers"],152:["Array","Dynamic Programming"],
    153:["Binary Search","Array"],154:["Binary Search","Array"],155:["Stack","Design"],160:["Linked List","Two Pointers"],
    162:["Binary Search","Array"],167:["Two Pointers","Array","Binary Search"],169:["Array","Hash Table"],189:["Array","Two Pointers"],
    204:["Math"],205:["Hash Table","String"],206:["Linked List"],209:["Sliding Window","Array","Binary Search","Prefix Sum"],
    216:["Backtracking","Array"],217:["Array","Hash Table","Sorting"],219:["Array","Hash Table","Sliding Window"],
    225:["Stack","Design","Queue"],231:["Bit Manipulation","Math"],232:["Stack","Design","Queue"],234:["Linked List","Two Pointers"],
    237:["Linked List"],238:["Array","Prefix Sum"],239:["Sliding Window","Queue","Heap"],240:["Binary Search","Matrix"],
    242:["Hash Table","String","Sorting"],258:["Math"],268:["Array","Math","Bit Manipulation"],278:["Binary Search"],
    287:["Two Pointers","Binary Search","Array"],326:["Math"],328:["Linked List"],344:["Two Pointers","String"],
    349:["Array","Hash Table","Sorting"],367:["Binary Search","Math"],374:["Binary Search"],387:["Hash Table","String","Queue"],
    394:["Stack","String"],395:["Sliding Window","Hash Table","String"],402:["Stack","Greedy","String"],
    409:["Hash Table","String","Greedy"],410:["Binary Search","Array","Dynamic Programming","Greedy"],412:["Math","String"],
    415:["Math","String"],424:["Sliding Window","Hash Table","String"],430:["Linked List"],
    438:["Sliding Window","Hash Table","String"],442:["Array","Hash Table"],443:["Two Pointers","String"],
    451:["Hash Table","String","Sorting","Heap"],485:["Array"],496:["Stack","Array"],503:["Stack","Array"],
    509:["Dynamic Programming","Math"],523:["Array","Hash Table","Math","Prefix Sum"],525:["Array","Hash Table","Prefix Sum"],
    540:["Binary Search","Array"],560:["Array","Hash Table","Prefix Sum"],567:["Sliding Window","Hash Table","String"],
    581:["Array","Sorting","Stack"],622:["Design","Queue","Array"],628:["Array","Math","Sorting"],633:["Two Pointers","Binary Search","Math"],
    682:["Stack","Array"],704:["Binary Search","Array"],713:["Sliding Window","Array"],724:["Array","Prefix Sum"],
    728:["Math"],735:["Stack","Array"],739:["Stack","Array"],796:["String"],844:["Two Pointers","String","Stack"],
    852:["Binary Search","Array"],853:["Stack","Sorting"],875:["Binary Search","Array"],876:["Linked List","Two Pointers"],
    901:["Stack"],907:["Stack","Array","Dynamic Programming"],912:["Array","Sorting"],930:["Sliding Window","Array","Hash Table","Prefix Sum"],
    933:["Design","Queue"],974:["Array","Hash Table","Prefix Sum"],992:["Sliding Window","Hash Table"],
    1004:["Sliding Window","Array","Binary Search","Prefix Sum"],1009:["Bit Manipulation"],1011:["Binary Search","Array","Greedy"],
    1021:["Stack","String"],1047:["Stack","String"],1089:["Array"],1248:["Sliding Window","Math","Hash Table"],
    1281:["Math"],1283:["Binary Search","Array"],1290:["Linked List","Math"],1358:["Sliding Window","Hash Table","String"],
    1423:["Sliding Window","Array","Greedy","Prefix Sum"],1482:["Binary Search","Array"],1486:["Bit Manipulation","Math","Array"],
    1492:["Math"],1512:["Array","Hash Table","Math"],1523:["Math"],1539:["Binary Search","Array"],
    1572:["Matrix","Array"],1614:["Stack","String"],1657:["Hash Table","String","Sorting"],1672:["Array","Matrix"],
    1700:["Queue","Stack"],1752:["Array"],1781:["Hash Table","String"],1901:["Binary Search","Matrix"],
    1903:["Math","String","Greedy"],1910:["String"],1920:["Array"],1922:["Math"],1929:["Array"],
    2011:["String"],2073:["Queue"],2095:["Linked List","Two Pointers"],2104:["Stack","Array"],
    2149:["Array","Two Pointers","Sorting"],2220:["Bit Manipulation"],2235:["Math"],2427:["Math"],
    2469:["Math"],2520:["Math"],2596:["Matrix"],2894:["Math"],2965:["Array","Matrix","Hash Table"],
    3467:["Array","Sorting"],3701:["Sliding Window","Hash Table","String"]
  };

  const getTopicsForProblem = (p) => {
    const num = p.id ?? p.number;
    if (TOPIC_MAP[num]) return TOPIC_MAP[num];
    if (p.topics && p.topics.length > 0) return p.topics;
    // Fallback: use existing pattern
    return [p.pattern || 'Miscellaneous'];
  };

  // Transform MongoDB schema → frontend schema
  const transformProblems = (data) => (data || []).map(p => {
    const solvedDateISO = p.solvedDate
      ? toLocalDateStr(new Date(p.solvedDate))
      : parseDDMMM(p.date);
    const topics = getTopicsForProblem(p);
    // Derive status from DB booleans: solved > inProgress > Not Started
    const status = p.solved ? 'Done' : p.inProgress ? 'In Progress' : 'Not Started';
    return {
      ...p,
      number: p.id ?? p.number,
      status,
      userDifficulty: p.userDifficulty || p.difficulty || 'Medium',
      topics: topics,
      pattern: topics[0] || (p.pattern || 'Miscellaneous'),
      link: p.leetcodeLink || p.link || '',
      _solvedDateISO: solvedDateISO,
    };
  });

  // Fetch problems + streak from API on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [probRes, streakRes] = await Promise.all([
          window.API.getAllProblems(),
          window.API.getStreak(),
        ]);
        if (probRes.success) setApiProblems(transformProblems(probRes.data));
        if (streakRes.success) setDbStreak(streakRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setApiError(error.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ============================================
  // LOCAL STATE — only data that has no backend equivalent
  // revisionFlags and solveTimes are device-local preferences.
  // Everything else (problems, solved dates, streaks) comes from apiProblems.
  // ============================================

  const getInitialState = () => {
    try {
      const saved = localStorage.getItem('priyanshu-leetcode-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          revisionFlags: parsed.revisionFlags || {},
          solveTimes: parsed.solveTimes || {},
          manualStats: parsed.manualStats || { currentStreak: null, maxStreak: null, activeDays: null },
        };
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
      localStorage.removeItem('priyanshu-leetcode-state');
    }
    return { revisionFlags: {}, solveTimes: {}, manualStats: { currentStreak: null, maxStreak: null, activeDays: null } };
  };

  const [state, setState] = useState(getInitialState());
  const [darkMode, setDarkMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [patternFilter, setPatternFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showAlignmentModal, setShowAlignmentModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Password protection
  const ADMIN_PASSWORD = '0';

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
  // HISTORICAL DATE GENERATION — DISABLED
  // Real dates come from MongoDB solvedDate field.
  // ============================================

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
        const date = parseLocalDate(dateStr);
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

  // ============================================
  // HEATMAP & STREAK CALCULATION
  // ============================================
  
  const calculateHeatmapAndStreak = (solvedDates) => {
    try {
      if (!solvedDates || typeof solvedDates !== 'object' || Object.keys(solvedDates).length === 0) {
        return { dateCounts: {}, activeDays: 0, currentStreak: 0, maxStreak: 0 };
      }

      // Count problems per date (heatmap intensity)
      const dateCounts = {};
      Object.values(solvedDates).forEach(dateStr => {
        if (dateStr) dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      });

      const uniqueDates = Object.keys(dateCounts).sort(); // ascending YYYY-MM-DD
      const activeDays = uniqueDates.length;

      // ── Current Streak ──────────────────────────────────────────────────────
      // Strict: streak = consecutive days ending TODAY (local). 0 if no solve today.
      const today = toLocalDateStr(new Date());
      let currentStreak = 0;
      if (dateCounts[today]) {
        let checkDate = new Date();
        while (true) {
          const ds = toLocalDateStr(checkDate);
          if (dateCounts[ds]) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // ── Max Streak ───────────────────────────────────────────────────────────
      let maxStreak = uniqueDates.length > 0 ? 1 : 0;
      let tempStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = parseLocalDate(uniqueDates[i - 1]);
        const curr = parseLocalDate(uniqueDates[i]);
        const diffDays = Math.round((curr - prev) / 86400000);
        if (diffDays === 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak);

      return { dateCounts, activeDays, currentStreak, maxStreak };
    } catch (error) {
      console.error('Error in calculateHeatmapAndStreak:', error);
      return { dateCounts: {}, activeDays: 0, currentStreak: 0, maxStreak: 0 };
    }
  };

  // ============================================
  // ADVANCED ANALYTICS
  // ============================================
  
  // 1️⃣ CONSISTENCY SCORE - REMOVED (Handled in useMemo later)

  // 2️⃣ WEEKLY PERFORMANCE
  const calculateWeeklyPerformance = (problems, solvedDates) => {
    if (!problems || !solvedDates) {
      return { thisWeek: 0, lastWeek: 0, change: 0, trend: '➡️' };
    }

    // Week = Monday → Sunday (ISO week). No mutation bug.
    const getMondayOf = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day; // shift to Monday
      d.setDate(d.getDate() + diff);
      return d;
    };

    const thisMonday = getMondayOf(new Date());
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday); // exclusive end of last week

    let thisWeekCount = 0;
    let lastWeekCount = 0;

    problems.forEach(problem => {
      if (problem && problem.status === 'Done' && problem.number && solvedDates[problem.number]) {
        const solvedDate = parseLocalDate(solvedDates[problem.number]);
        solvedDate.setHours(0, 0, 0, 0);
        if (solvedDate >= thisMonday) {
          thisWeekCount++;
        } else if (solvedDate >= lastMonday && solvedDate < lastSunday) {
          lastWeekCount++;
        }
      }
    });

    const change = lastWeekCount > 0
      ? parseFloat((((thisWeekCount - lastWeekCount) / lastWeekCount) * 100).toFixed(1))
      : thisWeekCount > 0 ? 100 : 0;

    return {
      thisWeek: thisWeekCount,
      lastWeek: lastWeekCount,
      change,
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
        const solvedDate = parseLocalDate(solvedDates[problem.number]);
        
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

  // 8️⃣ TARGET SUGGESTION
  const calculateTargetSuggestion = (problems, solvedDates) => {
    const dates = Object.values(solvedDates || {}).filter(d => d);
    if (dates.length === 0) return { hasData: false };
    
    const sortedDates = dates.sort();
    const firstDate = parseLocalDate(sortedDates[0]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDaysTracked = Math.max(1, Math.ceil((today - firstDate) / 86400000) + 1);
    
    // Hide section entirely if less than 7 days of data
    if (totalDaysTracked < 7) {
      return { hasData: false };
    }

    const last30Start = new Date(today);
    last30Start.setDate(last30Start.getDate() - 30);

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    let last30Count = 0;
    let currentMonthCount = 0;
    let lastMonthCount = 0;

    problems.forEach(p => {
      if (p.status === 'Done' && solvedDates[p.number]) {
        const d = parseLocalDate(solvedDates[p.number]);
        d.setHours(0, 0, 0, 0);
        if (d >= last30Start) last30Count++;
        if (d >= currentMonthStart) currentMonthCount++;
        if (d >= lastMonthStart && d < currentMonthStart) lastMonthCount++;
      }
    });

    const avgLast30 = last30Count / 30; // problems per day over last 30 days
    const moderate   = (avgLast30 * 1.2).toFixed(1);
    const aggressive = (avgLast30 * 1.5).toFixed(1);

    // Phase 8: daily required to hit moderate monthly target
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const remainingDays = Math.max(1, daysInMonth - dayOfMonth);
    const moderateMonthlyTarget = Math.round(parseFloat(moderate) * daysInMonth);
    const dailyRequired = Math.max(0, ((moderateMonthlyTarget - currentMonthCount) / remainingDays)).toFixed(1);

    return { hasData: true, last30Count, avgLast30: avgLast30.toFixed(2), moderate, aggressive, currentMonthCount, lastMonthCount, dailyRequired, moderateMonthlyTarget, remainingDays };
  };

  // ============================================
  // DATA LAYER
  // ============================================

  const allProblems = apiProblems;

  // ── Derive solvedDates directly from apiProblems (always fresh, no async lag) ──
  // SINGLE SOURCE OF TRUTH for all streak/active days/analytics.
  // Never stored in state — always computed. Refresh page → correct stats.
  const solvedDates = React.useMemo(() => {
    const map = {};
    apiProblems.forEach(p => {
      if (p.status === 'Done' && p._solvedDateISO) {
        map[p.number] = p._solvedDateISO;
      }
    });
    return map;
  }, [apiProblems]);

  // ============================================
  // HISTORICAL DATE GENERATION (ONE-TIME)
  // ============================================
  
  // Historical date generation removed — real dates come from MongoDB.

  // ============================================
  // CALCULATE ANALYTICS
  // ============================================
  
  const heatmapData = React.useMemo(
    () => calculateHeatmapAndStreak(solvedDates),
    [solvedDates]
  );

  // ── Debug: log computed vs manual stats ──
  React.useEffect(() => {
    console.log('[STATS]', {
      auto: { activeDays: heatmapData.activeDays, currentStreak: heatmapData.currentStreak, maxStreak: heatmapData.maxStreak },
      manual: state.manualStats,
      display: { activeDays: displayActiveDays, currentStreak: displayCurrentStreak, maxStreak: displayMaxStreak },
    });
  }, [heatmapData, state.manualStats]);
  
  const monthlyData = React.useMemo(
    () => getMonthlyStats(allProblems, solvedDates),
    [allProblems, solvedDates]
  );
  
  const currentMonthStats = React.useMemo(
    () => getCurrentMonthStats(monthlyData),
    [monthlyData]
  );
  
  const bestMonth = React.useMemo(
    () => getBestMonth(monthlyData),
    [monthlyData]
  );

  // ============================================
  // DUPLICATE PREVENTION
  // ============================================
  const problemExists = (number) => apiProblems.some(p => p.number === parseInt(number));

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
  
  const handleAddProblem = async (e) => {
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
      
      // Try to highlight the row if it's visible
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
      // Backend schema: id, title, difficulty, leetcodeLink, solved, solvedDate, topics
      id: problemNumber,
      title: formData.title,
      difficulty: formData.difficulty,
      topics: detectedPattern ? [detectedPattern] : [],
      leetcodeLink: formData.link || `https://leetcode.com/problems/${problemNumber}/`,
      solved: formData.type === 'Solved',
      solvedDate: formData.type === 'Solved' ? toLocalDateStr(new Date()) : null
    };

    try {
      // Add to API
      const response = await window.API.createProblem(newProblem);
      
      if (response.success) {
        // Update streak from backend response (3-case logic already applied server-side)
        if (response.streak) setDbStreak(response.streak);

        // Refetch problems — apiProblems update triggers all useMemo analytics automatically
        const allProblemsResponse = await window.API.getAllProblems();
        const problems = transformProblems(allProblemsResponse.data);
        setApiProblems(problems);
        
        showNotification(`✅ Problem #${problemNumber} added successfully!${formData.type === 'Solved' ? ' — Streak updated!' : ''}`, 'success');
        setShowModal(false);
        setFormData({ number: '', title: '', difficulty: 'Medium', type: 'Solved', pattern: '', link: '' });
        
        setTimeout(() => {
          const tableRow = document.querySelector(`tr[data-problem-number="${problemNumber}"]`);
          if (tableRow) {
            tableRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            tableRow.style.animation = 'highlightRow 2s ease';
          }
        }, 300);
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  // ============================================
  // OTHER HANDLERS
  // ============================================
  
  const handleStatusChange = async (number, newStatus) => {
    if (!verifyPassword('change status')) {
      return;
    }
    
    // Prompt for solve time when marking as Done
    let solveTime = null;
    if (newStatus === 'Done') {
      const time = prompt('Enter solve time in minutes (optional, press Cancel to skip):');
      if (time !== null && time.trim() !== '') {
        const minutes = parseInt(time);
        if (!isNaN(minutes) && minutes > 0) {
          solveTime = minutes;
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
    
    try {
      const today = toLocalDateStr(new Date());
      
      // Backend schema: solved=true only for 'Done', inProgress=true for 'In Progress'
      const updateData = {
        solved: newStatus === 'Done',
        inProgress: newStatus === 'In Progress',
        solvedDate: newStatus === 'Done' ? today : null
      };
      
      const response = await window.API.updateProblem(number, updateData);
      
      if (response.success) {
        // Update streak from backend response if problem was marked solved
        if (response.streak) setDbStreak(response.streak);

        // Refetch — solvedDates useMemo recomputes automatically from apiProblems
        const allProblemsResponse = await window.API.getAllProblems();
        const problems = transformProblems(allProblemsResponse.data);
        setApiProblems(problems);
        
        if (newStatus === 'Done') {
          showNotification('✓ Problem marked done — streak updated!', 'success');
        } else {
          showNotification(`✓ Status changed to ${newStatus}`, 'success');
        }
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  const handleUserDifficultyChange = async (number, newDifficulty) => {
    if (!verifyPassword('change difficulty')) {
      return;
    }
    
    try {
      // Update via API
      const response = await window.API.updateProblem(number, {
        userDifficulty: newDifficulty
      });
      
      if (response.success) {
        const allProblemsResponse = await window.API.getAllProblems();
        setApiProblems(transformProblems(allProblemsResponse.data));
        showNotification(`✓ Difficulty updated to ${newDifficulty}`, 'success');
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (number, isCustom) => {
    if (!verifyPassword('delete this problem')) {
      return;
    }
    
    const problem = allProblems.find(p => p.number === number);
    const confirmMessage = problem 
      ? `Are you sure you want to permanently delete:\n\n#${problem.number} - ${problem.title}\n\nThis action cannot be undone!`
      : 'Are you sure you want to delete this problem?';
    
    if (!confirm(confirmMessage)) return;

    // Optimistic fade-out
    const tableRow = document.querySelector(`tr[data-problem-number="${number}"]`);
    if (tableRow) {
      tableRow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      tableRow.style.opacity = '0';
      tableRow.style.transform = 'translateX(-20px)';
    }

    try {
      const response = await window.API.deleteProblem(number);
      
      if (response.success) {
        // Refetch — all analytics recompute automatically
        const allProblemsResponse = await window.API.getAllProblems();
        const problems = transformProblems(allProblemsResponse.data);
        setApiProblems(problems);
        
        // Clean up local-only state for this problem
        setState(prev => {
          const { [number]: _st, ...remainingSolveTimes } = prev.solveTimes || {};
          return { ...prev, solveTimes: remainingSolveTimes };
        });
        
        console.log('[DELETE]', { number, title: problem?.title, remaining: problems.length });
        showNotification(`✅ Problem #${number} deleted${problem ? ` — ${problem.title}` : ''}`, 'success');
      }
    } catch (error) {
      // Restore row visibility on failure
      if (tableRow) {
        tableRow.style.opacity = '1';
        tableRow.style.transform = 'none';
      }
      showNotification(`❌ Delete failed: ${error.message}`, 'error');
    }
  };

  const [revisingId, setRevisingId] = React.useState(null);

  const handleRevise = async (number) => {
    if (revisingId === number) return; // prevent double-click
    try {
      setRevisingId(number);
      const res = await window.API.reviseProblem(number);
      if (res.success) {
        // Patch only the revised problem in state — no full refetch needed
        setApiProblems(prev => prev.map(p =>
          p.number === number
            ? { ...p, revisionCount: res.data.revisionCount, lastRevisedAt: res.data.lastRevisedAt }
            : p
        ));
        showNotification('Revision recorded ✅', 'success');
      }
    } catch (err) {
      showNotification(`❌ ${err.message}`, 'error');
    } finally {
      setRevisingId(null);
    }
  };

  // ============================================
  // MANUAL STAT OVERRIDE HANDLERS
  // ============================================
  const handleStatClick = (key, currentVal) => {
    const label = key === 'currentStreak' ? 'Current Streak' : key === 'maxStreak' ? 'Max Streak' : 'Active Days';
    const input = prompt(`Enter new value for ${label}:`, currentVal);
    if (input === null) return;
    const val = parseInt(input.trim());
    if (isNaN(val) || val < 0) { showNotification('❌ Enter a valid number ≥ 0', 'error'); return; }
    setState(prev => ({ ...prev, manualStats: { ...(prev.manualStats || {}), [key]: val } }));
    showNotification(`✓ ${label} set to ${val}`, 'success');
  };

  const handleStatReset = (key) => {
    setState(prev => ({ ...prev, manualStats: { ...(prev.manualStats || {}), [key]: null } }));
    showNotification('↩ Reset to auto-computed value', 'success');
  };

  // ============================================
  // ALIGN — Re-fetch problems + streak from backend
  // ============================================
  const handleAlignHistoricalActivity = async () => {
    try {
      const [probRes, streakRes] = await Promise.all([
        window.API.getAllProblems(),
        window.API.getStreak(),
      ]);
      if (probRes.success) setApiProblems(transformProblems(probRes.data));
      if (streakRes.success) setDbStreak(streakRes.data);
    } catch (err) {
      console.error('Align failed:', err);
    }
  };

  const handleClearAllFilters = () => {
    // Add animation class to all filter inputs
    const filterInputs = document.querySelectorAll('.filter-input, .filter-select');
    filterInputs.forEach(input => {
      input.classList.add('filter-reset-animation');
    });
    
    // Remove animation class after animation completes
    setTimeout(() => {
      filterInputs.forEach(input => {
        input.classList.remove('filter-reset-animation');
      });
    }, 400);
    
    // Reset all filters
    setSearchTerm('');
    setDifficultyFilter('All');
    setPatternFilter('All');
    setStatusFilter('All');
    
    // Show notification
    showNotification('✨ All filters cleared', 'success');
  };

  // ESC key to clear all filters
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Only clear if any filter is active
        if (searchTerm || difficultyFilter !== 'All' || patternFilter !== 'All' || statusFilter !== 'All') {
          handleClearAllFilters();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, difficultyFilter, patternFilter, statusFilter]);

  // ============================================
  // DYNAMIC ANALYTICS CALCULATIONS
  // ============================================
  
  const totalSolved = allProblems.filter(p => p.status === 'Done').length;
  const totalProblems = allProblems.length;

  // Rolling 100
  const completedCycles = Math.floor(totalSolved / 100);
  const last100Progress = totalSolved % 100;
  const rollingProgressPercentage = last100Progress;

  // Resolved display values:
  // Priority: dbStreak (from MongoDB) > manualStats (localStorage override) > heatmapData (auto-computed)
  // Once isSetup=true, dbStreak is always authoritative.
  const displayCurrentStreak = dbStreak.isSetup ? dbStreak.currentStreak
    : (state.manualStats?.currentStreak != null ? state.manualStats.currentStreak : heatmapData.currentStreak);
  const displayMaxStreak = dbStreak.isSetup ? dbStreak.maxStreak
    : (state.manualStats?.maxStreak != null ? state.manualStats.maxStreak : heatmapData.maxStreak);
  const displayActiveDays = dbStreak.isSetup ? dbStreak.activeDays
    : (state.manualStats?.activeDays != null ? state.manualStats.activeDays : heatmapData.activeDays);

  // Advanced Analytics
  const consistencyScore = React.useMemo(() => {
    const dates = Object.values(solvedDates).filter(d => d);
    
    const sortedDates = [...dates].sort();
    const firstDate = sortedDates.length > 0 ? parseLocalDate(sortedDates[0]) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    firstDate.setHours(0, 0, 0, 0);
    const totalDaysTracked = Math.max(1, Math.ceil((today - firstDate) / 86400000) + 1);
    
    const activeDays = heatmapData.activeDays;
    const averageProblemsPerActiveDay = activeDays > 0 ? totalSolved / activeDays : 0;
    
    const safeActiveDays = Math.min(activeDays, totalDaysTracked);
    const consistency = totalDaysTracked > 0 ? (safeActiveDays / totalDaysTracked) * 100 : 0;
    
    let status, label;
    if (consistency < 40) { status = '🔴 Low'; label = 'Low'; }
    else if (consistency < 70) { status = '🟡 Improving'; label = 'Improving'; }
    else { status = '🟢 Strong Discipline'; label = 'Strong Discipline'; }
    
    return {
      score: Math.round(consistency),
      status, label,
      totalDaysTracked,
      activeDays: safeActiveDays,
      averageProblemsPerActiveDay: averageProblemsPerActiveDay.toFixed(1),
      firstDate: sortedDates.length > 0 ? sortedDates[0] : 'N/A'
    };
  }, [heatmapData.activeDays, totalSolved, solvedDates]);

  const weeklyPerformance = calculateWeeklyPerformance(allProblems, solvedDates);
  const dailyAverage = calculateDailyAverage(allProblems, solvedDates);
  const strongestDay = calculateStrongestDay(solvedDates);
  const solveTimes = calculateSolveTimes(allProblems, state.solveTimes || {});
  const targetSuggestion = React.useMemo(
    () => calculateTargetSuggestion(allProblems, solvedDates),
    [allProblems.length, solvedDates]
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

  // ============================================
  // PHASE 2: TOPIC STATS — per-topic strength analysis
  // ============================================
  const topicStats = React.useMemo(() => {
    const stats = {};
    const solvedProblems = allProblems.filter(p => p.status === 'Done');
    const totalSolvedCount = solvedProblems.length;

    solvedProblems.forEach(p => {
      const topics = p.topics || [p.pattern];
      const solvedDateStr = solvedDates[p.number];
      topics.forEach(topic => {
        if (!stats[topic]) stats[topic] = { solvedCount: 0, lastSolvedAt: null, strengthScore: 0 };
        stats[topic].solvedCount++;
        if (solvedDateStr && (!stats[topic].lastSolvedAt || solvedDateStr > stats[topic].lastSolvedAt)) {
          stats[topic].lastSolvedAt = solvedDateStr;
        }
      });
    });

    // Compute strengthScore
    Object.values(stats).forEach(s => {
      s.strengthScore = totalSolvedCount > 0 ? parseFloat((s.solvedCount / totalSolvedCount).toFixed(4)) : 0;
    });

    return stats;
  }, [allProblems, solvedDates]);

  // ============================================
  // PHASE 3: WEAKNESS DETECTION ENGINE
  // weaknessScore = (1/solvedCount)*0.6 + (daysSinceLastSolved/maxDays)*0.4
  // ============================================
  const weaknessAnalysis = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entries = Object.entries(topicStats);
    if (entries.length === 0) return [];

    // Find maxDays across all topics
    let maxDays = 1;
    entries.forEach(([, s]) => {
      if (s.lastSolvedAt) {
        const d = parseLocalDate(s.lastSolvedAt);
        const diff = Math.max(1, Math.ceil((today - d) / 86400000));
        if (diff > maxDays) maxDays = diff;
      }
    });

    return entries.map(([topic, s]) => {
      const daysSinceLast = s.lastSolvedAt
        ? Math.max(1, Math.ceil((today - parseLocalDate(s.lastSolvedAt)) / 86400000))
        : maxDays; // never solved = max staleness
      const weaknessScore = (1 / Math.max(1, s.solvedCount)) * 0.6 + (daysSinceLast / maxDays) * 0.4;
      return {
        topic,
        solvedCount: s.solvedCount,
        lastSolvedAt: s.lastSolvedAt,
        daysSinceLast,
        strengthScore: s.strengthScore,
        weaknessScore: parseFloat(weaknessScore.toFixed(4))
      };
    }).sort((a, b) => b.weaknessScore - a.weaknessScore);
  }, [topicStats]);

  // ============================================
  // PHASE 5: INTELLIGENT REVISION SYSTEM
  // revisionScore = daysSinceSolved + weaknessScore of topic
  // ============================================
  const intelligentRevision = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weaknessMap = {};
    weaknessAnalysis.forEach(w => { weaknessMap[w.topic] = w.weaknessScore; });

    const solvedProblems = allProblems.filter(p => p.status === 'Done' && solvedDates[p.number]);
    return solvedProblems.map(p => {
      const solvedDate = parseLocalDate(solvedDates[p.number]);
      const daysSinceSolved = Math.max(1, Math.ceil((today - solvedDate) / 86400000));
      const topics = p.topics || [p.pattern];
      const avgWeakness = topics.reduce((sum, t) => sum + (weaknessMap[t] || 0), 0) / topics.length;
      return {
        ...p,
        daysSinceSolved,
        revisionScore: parseFloat((daysSinceSolved + avgWeakness * 100).toFixed(2))
      };
    })
    .filter(p => p.daysSinceSolved >= 7) // only problems not revised in 7+ days
    .sort((a, b) => b.revisionScore - a.revisionScore)
    .slice(0, 10);
  }, [allProblems, solvedDates, weaknessAnalysis]);

  // ============================================
  // PHASE 4: TARGETED PROBLEMS ENGINE
  // Combines unsolved weak-topic problems + solved problems needing revision.
  // Each entry gets a reason tag and a numeric priority score for sorting.
  // ============================================
  const targetedProblems = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Weak topic threshold: topics with < 5 solved problems
    const WEAK_THRESHOLD = 5;
    const topicSolvedCount = {};
    allProblems.forEach(p => {
      if (p.status === 'Done') {
        (p.topics || [p.pattern]).forEach(t => {
          topicSolvedCount[t] = (topicSolvedCount[t] || 0) + 1;
        });
      }
    });
    const weakTopicSet = new Set(
      Object.entries(topicSolvedCount)
        .filter(([, count]) => count < WEAK_THRESHOLD)
        .map(([topic]) => topic)
    );
    // Also include top-half by weaknessScore from existing analysis
    weaknessAnalysis
      .slice(0, Math.max(1, Math.ceil(weaknessAnalysis.length / 2)))
      .forEach(w => weakTopicSet.add(w.topic));

    const results = [];

    allProblems.forEach(p => {
      const topics = p.topics || [p.pattern];
      const isWeakTopic = topics.some(t => weakTopicSet.has(t));
      const diffScore = p.difficulty === 'Hard' ? 3 : p.difficulty === 'Medium' ? 2 : 1;

      if (p.status !== 'Done') {
        // Unsolved — only include if in a weak topic
        if (!isWeakTopic) return;
        results.push({
          ...p,
          _reason: 'weak-topic',
          _reasonLabel: '🔥 Weak Topic',
          // Hard unsolved in weak topic = highest priority
          _priority: 100 + diffScore * 10,
        });
      } else {
        // Solved — check revision conditions
        const revCount = p.revisionCount || 0;
        const lastRevAt = p.lastRevisedAt ? new Date(p.lastRevisedAt) : null;
        const daysSinceRevision = lastRevAt
          ? Math.floor((today - lastRevAt) / 86400000)
          : Infinity;

        const neverRevised = revCount === 0;
        const staleRevision = daysSinceRevision > 7;

        if (!neverRevised && !staleRevision && !isWeakTopic) return;

        let reason, reasonLabel, priority;
        if (neverRevised && isWeakTopic) {
          reason = 'never-revised-weak';
          reasonLabel = '⚠️ Never Revised · Weak Topic';
          priority = 90 + diffScore * 10;
        } else if (neverRevised) {
          reason = 'never-revised';
          reasonLabel = '⚠️ Never Revised';
          priority = 70 + diffScore * 10;
        } else if (staleRevision && isWeakTopic) {
          reason = 'stale-weak';
          reasonLabel = `🕒 ${daysSinceRevision}d ago · Weak Topic`;
          priority = 60 + diffScore * 5;
        } else if (staleRevision) {
          reason = 'stale';
          reasonLabel = `🕒 ${daysSinceRevision}d ago`;
          priority = 40 + diffScore * 5;
        } else {
          reason = 'weak-topic-solved';
          reasonLabel = '🔥 Weak Topic';
          priority = 30 + diffScore * 3;
        }

        results.push({ ...p, _reason: reason, _reasonLabel: reasonLabel, _priority: priority });
      }
    });

    // Sort by priority descending, then by difficulty (Hard first)
    results.sort((a, b) => b._priority - a._priority || 0);

    return results.slice(0, 10);
  }, [allProblems, weaknessAnalysis, solvedDates]);

  // ============================================
  // PHASE 10: PERFORMANCE INSIGHTS
  // Natural-language insights generated from computed data
  // ============================================
  const performanceInsights = React.useMemo(() => {
    const insights = [];
    if (weaknessAnalysis.length === 0) return insights;

    // 1. Strongest vs weakest topic
    const strongest = weaknessAnalysis[weaknessAnalysis.length - 1];
    const weakest = weaknessAnalysis[0];
    if (strongest && weakest && strongest.topic !== weakest.topic) {
      insights.push(`💪 You are strong in ${strongest.topic} (${strongest.solvedCount} solved) but weak in ${weakest.topic} (${weakest.solvedCount} solved).`);
    }

    // 2. Weekly rate change
    const wp = weeklyPerformance;
    if (wp.lastWeek > 0) {
      const diff = wp.thisWeek - wp.lastWeek;
      if (diff > 0) {
        insights.push(`📈 Your solving rate increased ${Math.round((diff / wp.lastWeek) * 100)}% this week (${wp.thisWeek} vs ${wp.lastWeek} last week).`);
      } else if (diff < 0) {
        insights.push(`📉 Your solving rate dropped ${Math.abs(Math.round((diff / wp.lastWeek) * 100))}% this week (${wp.thisWeek} vs ${wp.lastWeek} last week).`);
      }
    }

    // 3. Staleness alerts — topics not practiced in 7+ days
    const staleTopics = weaknessAnalysis.filter(w => w.daysSinceLast >= 7);
    if (staleTopics.length > 0) {
      const topStale = staleTopics.slice(0, 3);
      topStale.forEach(s => {
        insights.push(`⏰ You haven't practiced ${s.topic} in ${s.daysSinceLast} days.`);
      });
    }

    // 4. Difficulty balance
    const solvedE = easyCount, solvedM = mediumCount, solvedH = hardCount;
    const totalD = solvedE + solvedM + solvedH;
    if (totalD > 0 && solvedH / totalD < 0.1) {
      insights.push(`⚠️ Only ${Math.round((solvedH / totalD) * 100)}% of your solves are Hard problems. Consider tackling more.`);
    }

    // 5. Consistency observation
    if (consistencyScore.score >= 70) {
      insights.push(`🔥 Excellent consistency at ${consistencyScore.score}% — keep the momentum!`);
    } else if (consistencyScore.score < 30) {
      insights.push(`🎯 Your consistency is at ${consistencyScore.score}%. Try solving at least 1 problem daily.`);
    }

    return insights;
  }, [weaknessAnalysis, weeklyPerformance, easyCount, mediumCount, hardCount, consistencyScore]);

  // Filters
  const patterns = ['All', ...new Set(allProblems.map(p => p.pattern))].sort();

  const filteredProblems = React.useMemo(() => {
    return allProblems.filter(problem => {
      const matchesSearch = 
        searchTerm.trim() === '' ||
        problem.number.toString().includes(searchTerm) ||
        (problem.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDifficulty = 
        difficultyFilter === 'All' || problem.difficulty === difficultyFilter;
      
      const matchesPattern = 
        patternFilter === 'All' || problem.pattern === patternFilter;
      
      const matchesStatus = 
        statusFilter === 'All' || problem.status === statusFilter;

      return matchesSearch && matchesDifficulty && matchesPattern && matchesStatus;
    });
  }, [allProblems, searchTerm, difficultyFilter, patternFilter, statusFilter]);

  // Animate table count when filtered problems change
  useEffect(() => {
    const countElement = document.querySelector('.table-count');
    if (countElement) {
      countElement.classList.add('count-update');
      setTimeout(() => {
        countElement.classList.remove('count-update');
      }, 500);
    }
  }, [filteredProblems.length]);

  // ============================================
  // EFFECTS
  // ============================================
  
  useEffect(() => {
    localStorage.setItem('priyanshu-leetcode-state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  // (auto-update for new month/day removed — state.lastUpdate no longer exists;
  //  monthly stats recompute automatically from apiProblems via useMemo)

  // Periodic sync — keeps problems + streak fresh across devices
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const [probRes, streakRes] = await Promise.all([
          window.API.getAllProblems(),
          window.API.getStreak(),
        ]);
        if (probRes.success) setApiProblems(transformProblems(probRes.data));
        if (streakRes.success) setDbStreak(streakRes.data);
        console.log('✅ Synced with backend');
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    };
    const syncInterval = setInterval(syncWithBackend, 5 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, []);

  // Clean up orphan local state (revisionFlags / solveTimes) for deleted problems.
  // Clean up orphan solveTimes for deleted problems.
  useEffect(() => {
    const validProblemNumbers = new Set(allProblems.map(p => p.number));
    const orphanSolveTimes = Object.keys(state.solveTimes || {}).map(Number).filter(num => !validProblemNumbers.has(num));
    if (orphanSolveTimes.length > 0) {
      setState(prev => {
        const newSolveTimes = { ...prev.solveTimes };
        orphanSolveTimes.forEach(num => delete newSolveTimes[num]);
        return { ...prev, solveTimes: newSolveTimes };
      });
    }
  }, [allProblems.length]);

  // ============================================
  // RENDER
  // ============================================
  
  try {
    // Show loading state while fetching from API
    if (loading) {
      return (
        <div className="app">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading your problems...</div>
            <div className="loading-subtext">Please wait</div>
          </div>
        </div>
      );
    }

    // Show error state if API fails
    if (apiError) {
      return (
        <div className="app">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <div className="error-title">Connection Error</div>
            <div className="error-message">{apiError}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              🔄 Retry Connection
            </button>
          </div>
        </div>
      );
    }

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
            <p className="subtitle">
              Competitive Programming Intelligence Engine
              <span className="live-indicator" title="All stats update in real-time">
                <span className="live-dot"></span> Live
              </span>
            </p>
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
          <div className="stat-card stat-accent">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-value">{displayActiveDays}</div>
              <div className="stat-label">Active Days</div>
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
            <div className="streak-header">
              <h3 className="card-title">🔥 Streak Stats</h3>
              <button 
                className="btn-align-activity"
                onClick={() => setShowAlignmentModal(true)}
                title={dbStreak.isSetup ? 'Edit streak stats' : 'Initial setup — set your streak'}
              >
                {dbStreak.isSetup ? '✏️ Edit' : '⚙️ Setup'}
              </button>
            </div>
            {/* Streak stats — click value to edit only if not yet set up via DB */}
            {(() => {
              const ms = state.manualStats || {};
              const isDbSetup = dbStreak.isSetup;

              const StatItem = ({ label, value, statKey, isManual }) => (
                <div className="streak-item" style={{ cursor: isDbSetup ? 'default' : 'pointer' }}
                  title={isDbSetup ? label : `Click to manually set ${label}`}>
                  <div className="streak-value"
                    onClick={() => !isDbSetup && handleStatClick(statKey, value)}
                    style={{ userSelect: 'none' }}>
                    {value}
                    {!isDbSetup && isManual && (
                      <span
                        title="Manual — click to reset"
                        onClick={(e) => { e.stopPropagation(); handleStatReset(statKey); }}
                        style={{ fontSize: '0.55rem', marginLeft: '4px', verticalAlign: 'super', color: 'var(--accent, #6366f1)', cursor: 'pointer' }}
                      >✏️</span>
                    )}
                  </div>
                  <div className="streak-label">{label}</div>
                </div>
              );
              return (
                <div className="streak-stats">
                  <StatItem label="Current Streak" value={displayCurrentStreak} statKey="currentStreak" isManual={ms.currentStreak != null} />
                  <div className="streak-divider"></div>
                  <StatItem label="Max Streak" value={displayMaxStreak} statKey="maxStreak" isManual={ms.maxStreak != null} />
                  <div className="streak-divider"></div>
                  <StatItem label="Active Days" value={displayActiveDays} statKey="activeDays" isManual={ms.activeDays != null} />
                </div>
              );
            })()}

            {/* Today Status */}
            <div className={`today-status ${(() => {
              const solvedToday = Object.values(solvedDates).includes(todayLocalStr);
              return solvedToday ? 'solved' : 'pending';
            })()}`}>
              {(() => {
                const solvedToday = Object.values(solvedDates).includes(todayLocalStr);
                return solvedToday
                  ? <><span className="status-icon">✅</span> Solved Today — Streak Alive</>
                  : <><span className="status-icon">❌</span> Solve 1 Problem to Keep Streak</>;
              })()}
            </div>

            {/* Last 7 Days Activity */}
            <div className="recent-activity-section">
              <div className="recent-activity-title">Last 7 Days Activity</div>
              <div className="recent-activity-grid">
                {(() => {
                  const days = [];
                  const today = new Date();
                  
                  for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = toLocalDateStr(date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    // Count problems solved on this date
                    const problemCount = Object.values(solvedDates).filter(
                      d => d === dateStr
                    ).length;
                    
                    const isToday = i === 0;
                    
                    days.push(
                      <div key={dateStr} className={`activity-day ${isToday ? 'today' : ''}`}>
                        <div className="activity-day-name">{dayName}</div>
                        <div className={`activity-day-count ${problemCount > 0 ? 'active' : 'inactive'}`}>
                          {problemCount > 0 ? problemCount : '—'}
                        </div>
                        <div className="activity-day-bar">
                          <div 
                            className="activity-day-bar-fill"
                            style={{ height: `${Math.min((problemCount / 5) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  }
                  return days;
                })()}
              </div>
            </div>

            {/* Next Milestone */}
            <div className="streak-milestone">
              <div className="milestone-header">
                <span className="milestone-label">Next Milestone</span>
                <span className="milestone-target">{displayCurrentStreak < 50 ? '50 Days' : '100 Days'}</span>
              </div>
              <div className="milestone-progress-bar">
                <div className="milestone-progress-fill" style={{ width: `${displayCurrentStreak < 50 ? (displayCurrentStreak / 50) * 100 : ((displayCurrentStreak - 50) / 50) * 100}%` }}></div>
              </div>
              <div className="milestone-text">{displayCurrentStreak < 50 ? `${displayCurrentStreak} / 50 days` : `${displayCurrentStreak} / 100 days`}</div>
            </div>

            {/* Motivation Message */}
            <div className="motivation-message">
              {displayCurrentStreak >= 30 ? '🔥 Discipline Level: Elite' : displayCurrentStreak >= 15 ? '⚡ Momentum Building' : '🚀 Build Your Streak'}
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
            <div className="monthly-progress" style={{ margin: '1rem 0' }}>
              <div className="monthly-count">
                <span className="monthly-value" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{currentMonthStats.count}</span>
              </div>
              <div className="monthly-label">Problems Solved</div>
            </div>
            
            {/* Suggested Target */}
            {targetSuggestion.hasData ? (
              <div className="suggestion-section">
                <div className="suggestion-header">
                  <span className="suggestion-icon">📊</span>
                  <span className="suggestion-title">Daily Operations Target</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    avg {targetSuggestion.avgLast30}/day (last 30d)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="suggestion-value" style={{ fontSize: '1.4rem' }}>{targetSuggestion.moderate}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Moderate (×1.2)</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="suggestion-value" style={{ fontSize: '1.4rem' }}>{targetSuggestion.aggressive}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Aggressive (×1.5)</div>
                  </div>
                </div>
                <div className="suggestion-tooltip">
                  💡 Based on {targetSuggestion.last30Count} solves in last 30 days ({targetSuggestion.avgLast30}/day avg)
                </div>
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', fontSize: '0.8rem' }}>
                  📌 Daily Required: <strong>{targetSuggestion.dailyRequired}</strong>/day to hit monthly target ({targetSuggestion.moderateMonthlyTarget}) — {targetSuggestion.remainingDays} days left
                </div>
              </div>
            ) : (
              <div className="suggestion-section">
                <div className="suggestion-header">
                  <span className="suggestion-icon">📊</span>
                  <span className="suggestion-title">Daily Operations Target</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  No Data — minimum 7 tracked days required.
                </div>
              </div>
            )}
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
                  <span className="detail-label">Start Date:</span>
                  <span className="detail-value">{consistencyScore.firstDate}</span>
                </div>
                <div className="consistency-detail-item">
                  <span className="detail-label">Total Days Tracked:</span>
                  <span className="detail-value">{consistencyScore.totalDaysTracked}</span>
                </div>
                <div className="consistency-detail-item">
                  <span className="detail-label">Active Days:</span>
                  <span className="detail-value">{consistencyScore.activeDays}</span>
                </div>
              </div>
              <div className="consistency-tooltip">
                💡 Consistency = (Active Days / Total Days Tracked) × 100
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

        {/* Performance Insights (Phase 10) */}
        {performanceInsights.length > 0 && (
          <div className="revision-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="card-title">🧠 Performance Insights</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {performanceInsights.map((insight, idx) => (
                <div key={idx} style={{ padding: '0.6rem 0.8rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-primary)' }}>
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic Weakness Analysis (Phase 3) */}
        <div className="revision-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title">📊 Topic Strength Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            weaknessScore = (1/solvedCount)×0.6 + (daysSinceLastSolved/maxDays)×0.4
          </p>
          {weaknessAnalysis.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              {weaknessAnalysis.slice(0, 12).map(w => (
                <div key={w.topic} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.82rem' }}>
                  <span style={{ minWidth: '120px', fontWeight: 500, color: 'var(--text-primary)' }}>{w.topic}</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(w.weaknessScore * 100, 100)}%`, height: '100%', background: w.weaknessScore > 0.5 ? 'var(--danger)' : w.weaknessScore > 0.3 ? 'var(--warning, #f59e0b)' : 'var(--success)', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                  </div>
                  <span style={{ minWidth: '40px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{w.solvedCount}✓</span>
                  <span style={{ minWidth: '50px', textAlign: 'right', fontSize: '0.75rem', color: w.daysSinceLast >= 7 ? 'var(--danger)' : 'var(--text-secondary)' }}>{w.daysSinceLast}d ago</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Solve problems to see topic analysis</div>
          )}
        </div>

        {/* Intelligent Revision (Phase 5) */}
        <div className="revision-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title">📝 Needs Revision ({intelligentRevision.length})</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            revisionScore = daysSinceSolved + (topicWeakness × 100). Problems not revisited in 7+ days.
          </p>
          {intelligentRevision.length > 0 ? (
            <div className="revision-list">
              {intelligentRevision.map(problem => (
                <div key={problem.number} className="revision-item">
                  <span className="revision-number">#{problem.number}</span>
                  <span className="revision-title" style={{ flex: 1 }}>{problem.title}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
                    {problem.daysSinceSolved}d ago
                  </span>
                  <span className={`badge badge-${(problem.difficulty || 'Medium').toLowerCase()}`} style={{ marginRight: '0.5rem' }}>
                    {problem.difficulty}
                  </span>
                  <button
                    className="btn-revised"
                    onClick={() => handleRevise(problem.number)}
                    disabled={revisingId === problem.number}
                  >
                    {revisingId === problem.number ? '⏳' : '🔁 Revise'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
              All problems revised recently ✅
            </div>
          )}
        </div>

        {/* Targeted Problems Engine */}
        <div className="revision-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>🎯 {targetedProblems.length} Targeted Problems</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Weak topics · Never revised · Stale revisions
            </span>
          </div>
          {targetedProblems.length > 0 ? (
            <div className="revision-list">
              {targetedProblems.map(problem => (
                <div key={problem.number} className="revision-item">
                  <span className="revision-number">#{problem.number}</span>
                  <span className="revision-title" style={{ flex: 1 }}>{problem.title}</span>
                  <span style={{
                    fontSize: '0.7rem', color: 'var(--text-secondary)',
                    marginRight: '0.5rem', whiteSpace: 'nowrap'
                  }}>
                    {problem._reasonLabel}
                  </span>
                  <span className={`badge badge-${(problem.difficulty || 'medium').toLowerCase()}`} style={{ marginRight: '0.5rem' }}>
                    {problem.difficulty}
                  </span>
                  {problem.status === 'Done' ? (
                    <button
                      className="btn-revised"
                      onClick={() => handleRevise(problem.number)}
                      disabled={revisingId === problem.number}
                    >
                      {revisingId === problem.number ? '⏳' : '🔁 Revise'}
                    </button>
                  ) : (
                    <a
                      href={problem.link || `https://leetcode.com/problems/${problem.number}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="problem-link-btn"
                    >
                      🔗 Solve
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
              No targeted problems — keep solving to build data
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div className="progress-card">
          <div className="progress-header">
            <div>
              <h2>Rolling Focus: Latest 100 Problems</h2>
              <p className="progress-subtitle">
                Current Cycle: {last100Progress} / 100 
                {completedCycles > 0 && ` • Completed ${completedCycles} cycle${completedCycles > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="progress-actions">
              <button className="btn-add-problem" onClick={() => setShowModal(true)}>
                <span>+</span> Add Problem
              </button>
            </div>
          </div>
          <div className="progress-bar-wrapper">
            <div className="progress-bar-track">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${rollingProgressPercentage}%` }}
              >
                <span className="progress-bar-text">{rollingProgressPercentage}%</span>
              </div>
            </div>
          </div>
          <div className="rolling-stats">
            <div className="rolling-stat-item">
              <span className="rolling-stat-label">Total Problems:</span>
              <span className="rolling-stat-value">{totalProblems}</span>
            </div>
            <div className="rolling-stat-divider"></div>
            <div className="rolling-stat-item">
              <span className="rolling-stat-label">Solved:</span>
              <span className="rolling-stat-value solved">{totalSolved}</span>
            </div>
          </div>
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
            {(searchTerm || difficultyFilter !== 'All' || patternFilter !== 'All' || statusFilter !== 'All') && (
              <div className="filter-group filter-clear-group">
                <label>&nbsp;</label>
                <button 
                  className="btn-clear-filters"
                  onClick={handleClearAllFilters}
                  title="Clear all filters (ESC)"
                >
                  Clear
                </button>
              </div>
            )}
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
                  <th>Revisions</th>
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
                        <span className={`badge badge-${(problem.difficulty || 'medium').toLowerCase()}`}>
                          {problem.difficulty}
                        </span>
                      </td>
                      <td>
                        <select
                          className={`difficulty-select difficulty-${(problem.userDifficulty || 'medium').toLowerCase()}`}
                          value={problem.userDifficulty}
                          onChange={(e) => handleUserDifficultyChange(problem.number, e.target.value)}
                        >
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                      </td>
                      <td>
                        {(() => {
                          const count = problem.revisionCount || 0;
                          const last = problem.lastRevisedAt;
                          const daysAgo = last
                            ? Math.floor((Date.now() - new Date(last)) / 86400000)
                            : null;
                          const label = daysAgo === null ? null
                            : daysAgo === 0 ? 'Today'
                            : daysAgo === 1 ? '1 day ago'
                            : `${daysAgo} days ago`;
                          return (
                            <span style={{
                              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                              padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600',
                              background: count > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                              color: count > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                              lineHeight: 1.3,
                            }} title={label ? `Last revised: ${label}` : 'Not revised yet'}>
                              🔁 {count}
                              {label && <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>{label}</span>}
                            </span>
                          );
                        })()}
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
                          className={`status-select status-${(problem.status || 'not-started').toLowerCase().replace(' ', '-')}`}
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
                              className="btn-revision"
                              onClick={() => handleRevise(problem.number)}
                              disabled={revisingId === problem.number}
                              title="Record a revision"
                            >
                              {revisingId === problem.number ? '⏳' : '🔁'}
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
                      {allProblems.length === 0 ? (
                        <>
                          <div className="empty-icon">📚</div>
                          <p className="empty-title">No Problems Yet</p>
                          <small>Click "Add Problem" to start tracking your LeetCode journey</small>
                        </>
                      ) : (
                        <>
                          <div className="empty-icon">🔍</div>
                          <p className="empty-title">No problems found</p>
                          <small>Try adjusting your filters or search term</small>
                        </>
                      )}
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

      {/* Manual Stats Modal */}
      {showAlignmentModal && (() => {
        const isDbSetup = dbStreak.isSetup;
        const ms = state.manualStats || {};

        const handleSave = async (e) => {
          e.preventDefault();
          const form = e.target;
          const parse = (name) => {
            const v = form[name].value.trim();
            return v === '' ? null : parseInt(v);
          };
          const cs = parse('currentStreak');
          const mx = parse('maxStreak');
          const ad = parse('activeDays');

          if (cs === null || mx === null || ad === null) {
            showNotification('❌ All three fields are required', 'error'); return;
          }
          if (cs < 0 || mx < 0 || ad < 0) {
            showNotification('❌ Values must be ≥ 0', 'error'); return;
          }
          if (mx < cs) {
            showNotification('❌ Max Streak must be ≥ Current Streak', 'error'); return;
          }
          if (ad < cs) {
            showNotification('❌ Active Days must be ≥ Current Streak', 'error'); return;
          }

          try {
            const payload = { currentStreak: cs, maxStreak: mx, activeDays: ad };
            if (isDbSetup) payload.force = true; // editing after setup
            const res = await window.API.updateStreak(payload);
            if (res.success) {
              setDbStreak(res.data);
              // Also clear any localStorage manual overrides — DB is now authoritative
              setState(prev => ({ ...prev, manualStats: { currentStreak: null, maxStreak: null, activeDays: null } }));
              setShowAlignmentModal(false);
              showNotification('✓ Stats saved to database', 'success');
            }
          } catch (err) {
            showNotification(`❌ ${err.message}`, 'error');
          }
        };

        return (
          <div className="modal-overlay" onClick={() => setShowAlignmentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{isDbSetup ? '✏️ Edit Stats' : '⚙️ Initial Setup — Set Your Stats'}</h2>
                <button className="modal-close" onClick={() => setShowAlignmentModal(false)}>×</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {!isDbSetup && (
                    <div className="form-hint" style={{ background: 'rgba(99,102,241,0.1)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                      🚀 First-time setup — enter your current stats from LeetCode. After this, streak updates automatically when you add solved problems.
                    </div>
                  )}
                  {isDbSetup && (
                    <div className="form-hint" style={{ background: 'rgba(245,158,11,0.1)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                      ⚠️ Stats are auto-managed. Only edit if you need to correct a mistake.
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Current Streak (days)</label>
                    <input name="currentStreak" type="number" min="0" className="form-input"
                      defaultValue={isDbSetup ? dbStreak.currentStreak : (ms.currentStreak != null ? ms.currentStreak : '')}
                      placeholder="e.g. 12" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Streak (days)</label>
                    <input name="maxStreak" type="number" min="0" className="form-input"
                      defaultValue={isDbSetup ? dbStreak.maxStreak : (ms.maxStreak != null ? ms.maxStreak : '')}
                      placeholder="e.g. 30" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Active Days</label>
                    <input name="activeDays" type="number" min="0" className="form-input"
                      defaultValue={isDbSetup ? dbStreak.activeDays : (ms.activeDays != null ? ms.activeDays : '')}
                      placeholder="e.g. 45" required />
                  </div>
                  <div className="form-hint">
                    💡 Rules: Max Streak ≥ Current Streak, Active Days ≥ Current Streak
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowAlignmentModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">✓ Save to Database</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}



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
