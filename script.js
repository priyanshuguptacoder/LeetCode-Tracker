const { useState, useEffect, useRef } = React;

// ============================================
// COUNT-UP HOOK — animates 0 → target value
// ============================================
function useCountUp(target, duration = 1200, enabled = true) {
  const [value, setValue] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (!enabled || typeof target !== 'number') return;
    const start = performance.now();
    const from = 0;
    const to = target;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return value;
}

// ============================================
// STAT CARD — animated number + icon accent
// ============================================
function StatCard({ value, label, icon, gradient, delay = 0, isReady }) {
  const animated = useCountUp(value, 1200, isReady);
  return (
    <div className="navbar-stat" style={{ animationDelay: `${delay}s` }}>
      {icon && <div className="navbar-stat-icon">{icon}</div>}
      <span className="navbar-stat-value">{animated}</span>
      <span className="navbar-stat-label">{label}</span>
    </div>
  );
}

// ============================================
// PROBLEM CARD — unified reusable card
// Used by: Recently Solved, Needs Revision, Targeted Problems
// variant: 'solved' | 'revision' | 'targeted'
// ============================================
function ProblemCard({ p, variant, onRevise, revisingId, formatDate, onUserDiffChange, onTarget, targetingId }) {
  const diffLower = (p.difficulty || 'medium').toLowerCase();
  const userDiff = p.userDifficulty || p.difficulty || 'Medium';

  return (
    <div className="pc-card">
      {/* Top row: ID + user difficulty dropdown */}
      <div className="pc-top-row">
        <span className="pc-id">#{p.number}</span>
        <select
          className={`pc-user-diff-select pc-user-diff-${userDiff.toLowerCase()}`}
          value={userDiff}
          onChange={(e) => onUserDiffChange && onUserDiffChange(p.number, e.target.value)}
          title="Your experience with this problem"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="Easy">Easy ✓</option>
          <option value="Medium">Medium ~</option>
          <option value="Hard">Hard ✗</option>
        </select>
      </div>

      {/* Title */}
      <div className="pc-title">{p.title}</div>

      {/* Meta: difficulty badge + variant-specific info */}
      <div className="pc-meta">
        <span className={`badge badge-${diffLower}`}>{p.difficulty}</span>
        {variant === 'revision' && (p.revisionCount || 0) > 0 && (
          <span className="pc-rev-badge">🔁 Revised {p.revisionCount}×</span>
        )}
        {variant === 'solved' && p._solvedDateISO && (
          <span className="pc-date">📅 {formatDate(p._solvedDateISO)}</span>
        )}
        {variant === 'targeted' && (
          <span className="pc-targeted-badge">
            {(p.revisionCount || 0) === 0 ? '📝 Never Revised' : `🔁 Revised ${p.revisionCount}×`}
          </span>
        )}
      </div>

      {/* Secondary info row */}
      {variant === 'revision' && p.daysSinceSolved && (
        <div className="pc-sub-info">Solved {p.daysSinceSolved}d ago</div>
      )}
      {variant === 'revision' && p.lastRevisedAt && (
        <div className="pc-sub-info">Last revised: {formatDate(p.lastRevisedAt)}</div>
      )}
      {variant === 'targeted' && p.lastRevisedAt && (
        <div className="pc-sub-info">Last revised: {formatDate(p.lastRevisedAt)}</div>
      )}
      {variant === 'targeted' && p.status === 'Done' && (
        <div className="pc-sub-info" style={{ color: 'var(--success)' }}>✅ Solved</div>
      )}
      {variant === 'targeted' && p.status !== 'Done' && (
        <div className="pc-sub-info">Status: {p.status}</div>
      )}

      {/* Actions */}
      <div className="pc-actions">
        <a
          href={p.link || `https://leetcode.com/problems/${p.number}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="pc-btn pc-btn-open"
        >Open ↗</a>
        {variant === 'revision' && (
          <button
            className="pc-btn pc-btn-revise"
            onClick={() => onRevise(p.number)}
            disabled={revisingId === p.number}
          >
            {revisingId === p.number ? '⏳' : '🔁 Revise'}
          </button>
        )}
        {variant === 'targeted' && (
          <button
            className="pc-btn pc-btn-revise"
            onClick={() => onRevise && onRevise(p.number)}
            disabled={revisingId === p.number}
          >
            {revisingId === p.number ? '⏳' : '🔁 Revise'}
          </button>
        )}
        {variant === 'targeted' && (
          <button
            className="pc-btn pc-btn-untarget"
            onClick={() => onTarget && onTarget(p.number)}
            disabled={targetingId === p.number}
            title="Remove from targeted"
          >
            {targetingId === p.number ? '⏳' : '✕ Remove'}
          </button>
        )}
      </div>
    </div>
  );
}

// Grid class based on item count
function getPcGridClass(count) {
  if (count <= 2) return 'pc-grid pc-grid-stretch';
  if (count <= 4) return 'pc-grid pc-grid-mid';
  return 'pc-grid';
}

// Reusable section renderer
function ProblemSection({ title, items, variant, emptyIcon, emptyMsg, emptyHint, onRevise, revisingId, formatDate, onUserDiffChange, onTarget, targetingId }) {
  const gridClass = getPcGridClass(items.length);
  return (
    <div className="pc-section">
      <h3 className="card-title">{title} ({items.length})</h3>
      {items.length > 0 ? (
        <div className={gridClass}>
          {items.map(p => (
            <ProblemCard
              key={p.number}
              p={p}
              variant={variant}
              onRevise={onRevise}
              revisingId={revisingId}
              formatDate={formatDate}
              onUserDiffChange={onUserDiffChange}
              onTarget={onTarget}
              targetingId={targetingId}
            />
          ))}
        </div>
      ) : (
        <div className="pc-empty">
          <div className="pc-empty-icon">{emptyIcon}</div>
          <div>{emptyMsg}</div>
          <small>{emptyHint}</small>
        </div>
      )}
    </div>
  );
}

// ============================================
// ADMIN AUTH MODAL — session-based unlock
// Password: '0' (UI-level lock only, not real security)
// ============================================
function AdminModal({ onClose, onUnlock, adminPassword }) {
  const [pwVal, setPwVal] = React.useState('');
  const [pwErr, setPwErr] = React.useState('');

  const handleUnlock = () => {
    if (pwVal === adminPassword) {
      onUnlock();
      onClose();
    } else {
      setPwErr('Incorrect password');
      setPwVal('');
    }
  };

  return (
    <div className="pw-modal-overlay" onClick={onClose}>
      <div className="pw-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-icon">🔒</div>
        <h3>Admin Access</h3>
        <p>Enter password to modify data</p>
        <input
          type="password"
          placeholder="Password"
          value={pwVal}
          autoFocus
          onChange={e => { setPwVal(e.target.value); setPwErr(''); }}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
        />
        <div className="pw-modal-error">{pwErr}</div>
        <div className="pw-modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-confirm" onClick={handleUnlock}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

// Legacy PwModal kept for delete confirmation (danger variant)
// When modal.noAuth = true, skips password and just shows confirm/cancel
function PwModal({ modal, adminPassword, onClose }) {
  const [pwVal, setPwVal] = React.useState('');
  const [pwErr, setPwErr] = React.useState('');

  const handleConfirm = () => {
    if (modal.noAuth || pwVal === adminPassword) {
      modal.onConfirm();
      onClose();
    } else {
      setPwErr('Incorrect password');
      setPwVal('');
    }
  };

  return (
    <div className="pw-modal-overlay" onClick={onClose}>
      <div className="pw-modal" onClick={e => e.stopPropagation()}>
        <h3>{modal.title}</h3>
        {modal.subtitle && <p>{modal.subtitle}</p>}
        {!modal.noAuth && (
          <>
            <input
              type="password"
              placeholder="Enter password"
              value={pwVal}
              autoFocus
              onChange={e => { setPwVal(e.target.value); setPwErr(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            />
            <div className="pw-modal-error">{pwErr}</div>
          </>
        )}
        <div className="pw-modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={modal.danger ? 'btn-danger' : 'btn-confirm'}
            onClick={handleConfirm}
            autoFocus={!!modal.noAuth}
          >
            {modal.danger ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PURE HELPERS — module-level, no React deps
// ============================================

// Recompute streak/activeDays from an array of YYYY-MM-DD date strings.
// Used after delete to keep dbStreak display in sync without a DB round-trip.
function computeStreakFromDates(dateStrings) {
  const parseLocal = (s) => { const [y,m,d] = s.split('-'); return new Date(y, m-1, d); };
  const unique = [...new Set(dateStrings.filter(Boolean))].sort();
  const activeDays = unique.length;
  if (activeDays === 0) return { activeDays: 0, currentStreak: 0, maxStreak: 0 };

  // Max streak
  let maxStreak = 1, tempStreak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = Math.round((parseLocal(unique[i]) - parseLocal(unique[i-1])) / 86400000);
    if (diff === 1) { tempStreak++; } else { maxStreak = Math.max(maxStreak, tempStreak); tempStreak = 1; }
  }
  maxStreak = Math.max(maxStreak, tempStreak);

  // Current streak — consecutive days ending today or yesterday
  const now = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayStr = fmt(now);
  const yest = new Date(now); yest.setDate(yest.getDate()-1);
  const yesterdayStr = fmt(yest);
  const lastDate = unique[unique.length - 1];
  let currentStreak = 0;
  if (lastDate === todayStr || lastDate === yesterdayStr) {
    let i = unique.length - 1;
    currentStreak = 1;
    while (i > 0) {
      const diff = Math.round((parseLocal(unique[i]) - parseLocal(unique[i-1])) / 86400000);
      if (diff === 1) { currentStreak++; i--; } else break;
    }
  }

  return { activeDays, currentStreak, maxStreak };
}

// Compute striver stats from a problems array (pure, no side effects).
function computeStriverStats(problems) {
  const solved = problems.filter(p => p.isStriver && p.status === 'Done');
  return {
    easy:   solved.filter(p => p.difficulty === 'Easy').length,
    medium: solved.filter(p => p.difficulty === 'Medium').length,
    hard:   solved.filter(p => p.difficulty === 'Hard').length,
    total:  solved.length,
  };
}

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
  const [striverId, setStriverId] = useState(null);

  // Ref to always access latest apiProblems without stale closure issues
  const apiProblemsRef = useRef([]);
  useEffect(() => { apiProblemsRef.current = apiProblems; }, [apiProblems]);

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

  const formatDate = (date) => {
    if (!date) return '—';
    // For YYYY-MM-DD strings, parse as local date to avoid UTC shift
    let d;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      d = parseLocalDate(date);
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) return '—';
    const todayLocal = parseLocalDate(toLocalDateStr(new Date()));
    const days = Math.floor((todayLocal - d) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days <= 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
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
      targeted: p.targeted || false,
      isStriver: p.isStriver || false,
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
  // manualStats allows manual override of streak/activeDays.
  // Everything else (problems, solved dates, streaks) comes from apiProblems.
  // ============================================

  const getInitialState = () => {
    try {
      const saved = localStorage.getItem('priyanshu-leetcode-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          manualStats: parsed.manualStats || { currentStreak: null, maxStreak: null, activeDays: null },
        };
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
      localStorage.removeItem('priyanshu-leetcode-state');
    }
    return { manualStats: { currentStreak: null, maxStreak: null, activeDays: null } };
  };

  const [state, setState] = useState(getInitialState());
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // default dark
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef(null);

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  };
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [patternFilter, setPatternFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showAlignmentModal, setShowAlignmentModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // ── Password-confirm modal state (used for delete confirmation) ───────────
  const [pwModal, setPwModal] = useState(null);
  // pwModal = { title, subtitle, onConfirm, danger: bool } | null

  const openPwModal = (title, subtitle, onConfirm, danger = false, noAuth = false) => {
    setPwModal({ title, subtitle, onConfirm, danger, noAuth });
  };
  const closePwModal = () => setPwModal(null);

  // ── Admin session state ───────────────────────────────────────────────────
  // Session-based unlock: enter password once per tab, then all actions flow freely.
  const ADMIN_PASSWORD = '0000';
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(
    () => sessionStorage.getItem('admin') === 'true'
  );
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [showScrollBottom, setShowScrollBottom] = React.useState(true);
  React.useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setShowScrollTop(scrolled > 400);
      setShowScrollBottom(scrolled < maxScroll - 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on mount
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const autoLockTimerRef = useRef(null);

  const lockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('admin');
  };

  const unlockAdmin = () => {
    setIsAdminUnlocked(true);
    sessionStorage.setItem('admin', 'true');
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    autoLockTimerRef.current = setTimeout(lockAdmin, 30 * 60 * 1000);
  };

  // requireAdmin: if already unlocked → run action immediately, else show modal first
  const requireAdmin = (action) => {
    if (isAdminUnlocked) {
      action();
    } else {
      setPendingAction(() => action);
      setShowAdminModal(true);
    }
  };

  const handleAdminUnlock = () => {
    unlockAdmin();
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const [statsReady, setStatsReady] = React.useState(false);
  React.useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setStatsReady(true), 150);
      return () => clearTimeout(t);
    }
  }, [loading]);

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
    const thisWeekDays = new Set();

    problems.forEach(problem => {
      if (problem && problem.status === 'Done' && problem.number && solvedDates[problem.number]) {
        const solvedDate = parseLocalDate(solvedDates[problem.number]);
        solvedDate.setHours(0, 0, 0, 0);
        if (solvedDate >= thisMonday) {
          thisWeekCount++;
          thisWeekDays.add(solvedDates[problem.number]);
        } else if (solvedDate >= lastMonday && solvedDate < lastSunday) {
          lastWeekCount++;
        }
      }
    });

    const change = lastWeekCount > 0
      ? parseFloat((((thisWeekCount - lastWeekCount) / lastWeekCount) * 100).toFixed(1))
      : thisWeekCount > 0 ? 100 : 0;

    const thisWeekAvgPerDay = thisWeekDays.size > 0 ? (thisWeekCount / thisWeekDays.size).toFixed(1) : '0';
    const contextLabel = change <= -30 ? 'Below normal' : change >= 20 ? 'Good pace' : 'On track';

    return {
      thisWeek: thisWeekCount,
      lastWeek: lastWeekCount,
      change,
      trend: change > 0 ? '📈' : change < 0 ? '📉' : '➡️',
      thisWeekAvgPerDay,
      contextLabel
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

    // Last 30 days avg
    const last30Start = new Date(today);
    last30Start.setDate(last30Start.getDate() - 30);
    let last30Count = 0;
    const last30Days = new Set();
    problems.forEach(problem => {
      if (problem && problem.status === 'Done' && problem.number && solvedDates[problem.number]) {
        const solvedDate = parseLocalDate(solvedDates[problem.number]);
        if (solvedDate >= last30Start) {
          last30Count++;
          last30Days.add(solvedDates[problem.number]);
        }
      }
    });
    const last30Avg = last30Days.size > 0 ? (last30Count / last30Days.size).toFixed(2) : 0;
    
    let trend = 'Stable';
    if (last7Avg > prev7Avg) trend = 'Improving';
    else if (last7Avg < prev7Avg) trend = 'Declining';
    
    return {
      overallAvg,
      last7Avg,
      prev7Avg,
      last30Avg,
      trend,
      arrow: trend === 'Improving' ? '📈' : trend === 'Declining' ? '📉' : '➡️'
    };
  };

  const calculateStrongestDay = (solvedDates) => {
    if (!solvedDates) return { count: 0, date: 'N/A', topDays: [] };

    const dateCounts = {};
    Object.values(solvedDates).forEach(dateStr => {
      if (dateStr) dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    const sorted = Object.entries(dateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topDays = sorted.map(([date, count]) => ({
      count,
      label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    return {
      count: topDays[0]?.count || 0,
      date: topDays[0]
        ? new Date(sorted[0][0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A',
      topDays,
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
  // (removed — was referencing displayActiveDays before declaration)
  
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
  
  // verifyPassword removed — replaced by requireAdmin() session-based system

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

    // Validation first (no auth needed to validate)
    if (!formData.number || !formData.title || !formData.link) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    const problemNumber = parseInt(formData.number);
    if (problemNumber <= 0 || isNaN(problemNumber)) {
      showNotification('Problem number must be a positive integer', 'error');
      return;
    }
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

    requireAdmin(async () => {
      const hasPattern = formData.pattern && formData.pattern.trim() !== '';
      const detectedPattern = hasPattern ? formData.pattern : detectPattern(formData.title);
      const newProblem = {
        id: problemNumber,
        title: formData.title,
        difficulty: formData.difficulty,
        topics: detectedPattern ? [detectedPattern] : [],
        leetcodeLink: formData.link || `https://leetcode.com/problems/${problemNumber}/`,
        solved: formData.type === 'Solved',
        solvedDate: formData.type === 'Solved' ? toLocalDateStr(new Date()) : null,
        targeted: formData.type === 'Target',
        targetedAt: formData.type === 'Target' ? new Date().toISOString() : null,
      };
      try {
        const response = await window.API.createProblem(newProblem);
        if (response.success) {
          if (response.streak) setDbStreak(response.streak);
          const allProblemsResponse = await window.API.getAllProblems();
          setApiProblems(transformProblems(allProblemsResponse.data));
          showNotification(`✅ Problem #${problemNumber} added!${formData.type === 'Solved' ? ' — Streak updated!' : ''}`, 'success');
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
    });
  };

  // ============================================
  // OTHER HANDLERS
  // ============================================
  
  const handleStatusChange = async (number, newStatus) => {
    requireAdmin(async () => {
      try {
        const today = toLocalDateStr(new Date());
        const updateData = {
          solved: newStatus === 'Done',
          inProgress: newStatus === 'In Progress',
          solvedDate: newStatus === 'Done' ? today : null
        };
        const response = await window.API.updateProblem(number, updateData);
        if (response.success) {
          if (response.streak) setDbStreak(response.streak);
          const allProblemsResponse = await window.API.getAllProblems();
          setApiProblems(transformProblems(allProblemsResponse.data));
          showNotification(newStatus === 'Done' ? '✓ Marked done — streak updated!' : `✓ Status → ${newStatus}`, 'success');
        }
      } catch (error) {
        showNotification(`❌ Error: ${error.message}`, 'error');
      }
    });
  };

  const handleUserDifficultyChange = async (number, newDifficulty) => {
    requireAdmin(async () => {
      try {
        const response = await window.API.updateProblem(number, { userDifficulty: newDifficulty });
        if (response.success) {
          const allProblemsResponse = await window.API.getAllProblems();
          setApiProblems(transformProblems(allProblemsResponse.data));
          showNotification(`✓ Difficulty → ${newDifficulty}`, 'success');
        }
      } catch (error) {
        showNotification(`❌ Error: ${error.message}`, 'error');
      }
    });
  };

  const handleDelete = (number, isCustom) => {
    const problem = apiProblemsRef.current.find(p => p.number === number);
    const doDelete = async () => {
      const tableRow = document.querySelector(`[data-problem-number="${number}"]`);
      if (tableRow) {
        tableRow.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        tableRow.style.opacity = '0';
        tableRow.style.transform = 'translateX(-16px)';
      }
      try {
        const response = await window.API.deleteProblem(number);
        if (response.success) {
          // Remove from local state — all useMemo stats (striverStats, etc.) recompute automatically
          setApiProblems(prev => prev.filter(p => p.number !== number));
          // If deleted problem was solved, recompute streak from the post-delete dataset
          if (problem && problem.status === 'Done') {
            // Use ref to get fresh state even after admin modal delay
            const remainingDates = apiProblemsRef.current
              .filter(p => p.number !== number && p.status === 'Done' && p._solvedDateISO)
              .map(p => p._solvedDateISO);
            const computed = computeStreakFromDates(remainingDates);
            setDbStreak(s => ({
              ...s,
              activeDays:    computed.activeDays,
              currentStreak: computed.currentStreak,
              maxStreak:     computed.maxStreak,
            }));
          }
          showNotification(`✅ Problem #${number} deleted`, 'success');
        }
      } catch (error) {
        if (tableRow) { tableRow.style.opacity = '1'; tableRow.style.transform = 'none'; }
        showNotification(`❌ Delete failed: ${error.message}`, 'error');
      }
    };
    requireAdmin(() => {
      openPwModal(
        `Delete #${number}${problem ? ` — ${problem.title}` : ''}`,
        'This action cannot be undone.',
        doDelete,
        true,
        true
      );
    });
  };

  const [revisingId, setRevisingId] = React.useState(null);
  const [unrevisingId, setUnrevisingId] = React.useState(null);

  const handleRevise = (number) => {
    requireAdmin(async () => {
      if (revisingId === number) return;
      try {
        setRevisingId(number);
        const res = await window.API.reviseProblem(number);
        if (res.success) {
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
    });
  };

  const handleUnrevise = (number) => {
    requireAdmin(async () => {
      if (unrevisingId === number) return;
      try {
        setUnrevisingId(number);
        const res = await window.API.unreviseProblem(number);
        if (res.success) {
          setApiProblems(prev => prev.map(p =>
            p.number === number
              ? { ...p, revisionCount: res.data.revisionCount, lastRevisedAt: res.data.lastRevisedAt }
              : p
          ));
          showNotification('Revision removed ✅', 'success');
        }
      } catch (err) {
        showNotification(`❌ ${err.message}`, 'error');
      } finally {
        setUnrevisingId(null);
      }
    });
  };

  const [targetingId, setTargetingId] = React.useState(null);

  const handleToggleTarget = (number) => {
    requireAdmin(async () => {
      if (targetingId === number) return;
      // Use ref to get fresh state even after admin modal delay
      const problem = apiProblemsRef.current.find(p => p.number === number);
      const isCurrentlyTargeted = problem?.targeted || false;
      try {
        setTargetingId(number);
        const res = isCurrentlyTargeted
          ? await window.API.untargetProblem(number)
          : await window.API.targetProblem(number);
        if (res.success) {
          setApiProblems(prev => prev.map(p =>
            p.number === number
              ? { ...p, targeted: res.data.targeted, targetedAt: res.data.targetedAt }
              : p
          ));
          showNotification(
            res.data.targeted ? '🎯 Added to Targeted' : '✅ Removed from Targeted',
            'success'
          );
        }
      } catch (err) {
        showNotification(`❌ ${err.message}`, 'error');
      } finally {
        setTargetingId(null);
      }
    });
  };

  // ============================================
  // STRIVER TOGGLE
  // ============================================
  const handleToggleStriver = (number) => {
    requireAdmin(async () => {
      if (striverId === number) return;
      try {
        setStriverId(number);
        const res = await window.API.toggleStriver(number);
        if (res.success) {
          // Update local state — striverStats useMemo recomputes automatically
          setApiProblems(prev => prev.map(p =>
            p.number === number ? { ...p, isStriver: res.data.isStriver } : p
          ));
          showNotification(
            res.data.isStriver ? '📘 Added to Striver sheet' : '✅ Removed from Striver',
            'success'
          );
        }
      } catch (err) {
        showNotification(`❌ ${err.message}`, 'error');
      } finally {
        setStriverId(null);
      }
    });
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
    setDebouncedSearch('');
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
        if (searchTerm || debouncedSearch || difficultyFilter !== 'All' || patternFilter !== 'All' || statusFilter !== 'All') {
          handleClearAllFilters();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, debouncedSearch, difficultyFilter, patternFilter, statusFilter]);

  // ============================================
  // DYNAMIC ANALYTICS CALCULATIONS
  // ============================================
  
  // ── Derived: striver stats — always computed from apiProblems, never stored in state ──
  const striverStats = React.useMemo(() => computeStriverStats(apiProblems), [apiProblems]);

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
  // Data Rule: problems where revisionCount > 0
  // Sort: most recently revised first (lastRevisedAt desc)
  // Cap: max 9. Show all if ≤ 9.
  // ============================================
  const intelligentRevision = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Include ALL problems with revisionCount > 0 (regardless of solved status)
    const revisedProblems = allProblems.filter(p => (p.revisionCount || 0) > 0);
    if (revisedProblems.length === 0) return [];

    return revisedProblems
      .map(p => {
        const solvedDateStr = solvedDates[p.number];
        const daysSinceSolved = solvedDateStr
          ? Math.max(1, Math.ceil((today - parseLocalDate(solvedDateStr)) / 86400000))
          : null;
        return { ...p, daysSinceSolved };
      })
      .sort((a, b) => {
        // Sort by lastRevisedAt descending (most recently revised first)
        const aTime = a.lastRevisedAt ? new Date(a.lastRevisedAt).getTime() : 0;
        const bTime = b.lastRevisedAt ? new Date(b.lastRevisedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 9);
  }, [allProblems, solvedDates]);

  // ============================================
  // TARGETED PROBLEMS — manually marked by user
  // Simple filter: problems where targeted === true
  // Sorted by targetedAt descending (most recently targeted first)
  // ============================================
  const targetedProblems = React.useMemo(() => {
    const list = allProblems
      .filter(p => p.targeted === true)
      .sort((a, b) => {
        const aTime = a.targetedAt ? new Date(a.targetedAt).getTime() : 0;
        const bTime = b.targetedAt ? new Date(b.targetedAt).getTime() : 0;
        return bTime - aTime;
      });
    console.log('🎯 Targeted Problems:', list.length, list.map(p => p.number));
    return { list, totalCount: list.length };
  }, [allProblems]);

  // ── Safety check: verify strict data separation ──────────────────────────
  React.useEffect(() => {
    const solvedProblems   = allProblems.filter(p => p.status === 'Done');
    const targetedList     = targetedProblems.list;
    const revisionList     = intelligentRevision;

    console.log('📊 Data Separation Check:', {
      solved:   solvedProblems.length,
      targeted: targetedList.length,
      revision: revisionList.length,
    });
  }, [allProblems, targetedProblems, intelligentRevision]);

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
    const q = debouncedSearch.trim().toLowerCase();
    return allProblems.filter(problem => {
      const matchesSearch =
        q === '' ||
        problem.number.toString().includes(q) ||
        (problem.title || '').toLowerCase().includes(q) ||
        (problem.difficulty || '').toLowerCase().includes(q) ||
        (problem.pattern || '').toLowerCase().includes(q) ||
        (problem.topics || []).some(t => t.toLowerCase().includes(q));

      const matchesDifficulty =
        difficultyFilter === 'All' || problem.difficulty === difficultyFilter;

      const matchesPattern =
        patternFilter === 'All' || problem.pattern === patternFilter;

      const matchesStatus =
        statusFilter === 'All' || 
        (statusFilter === 'Targeted' ? problem.targeted === true :
         statusFilter === 'Striver'  ? problem.isStriver === true :
         problem.status === statusFilter);

      return matchesSearch && matchesDifficulty && matchesPattern && matchesStatus;
    });
  }, [allProblems, debouncedSearch, difficultyFilter, patternFilter, statusFilter]);

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
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Navbar scroll shadow
  useEffect(() => {
    const header = document.querySelector('.header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // ============================================
  // RENDER
  // ============================================
  
  try {
    // Show loading state while fetching from API
    if (loading) {
      const Sk = ({ w = '100%', h = 12, style = {} }) => (
        <div className="skeleton" style={{ width: w, height: h, borderRadius: 6, ...style }} />
      );
      return (
        <div className="app">
          {/* Real navbar — loads instantly */}
          <header className="header">
            <div className="header-content">
              <div className="header-title">
                <h1>Priyanshu Gupta</h1>
                <p className="subtitle">
                  Your Personal DSA Growth Engine
                  <span className="live-indicator">
                    <span className="live-dot"></span> 🟢 Real-time Sync
                  </span>
                </p>
              </div>
              <div className="header-actions">
                <a href="https://leetcode.com/u/priyanshuguptacoder/" target="_blank" rel="noopener noreferrer" className="btn-profile">
                  <span>LeetCode Profile</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                </a>
                <button className="theme-toggle">{darkMode ? '☀️' : '🌙'}</button>
              </div>
            </div>
          </header>

          <div className="container">
            {/* Subtle sync label */}
            <p className="sk-sync-label">Syncing your data...</p>

            {/* Stats bar skeleton */}
            <div className="sk-stats-bar" style={{ marginBottom: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="sk-stat-pill">
                  <Sk w={44} h={20} />
                  <Sk w={68} h={9} style={{ marginTop: 6 }} />
                </div>
              ))}
            </div>

            {/* Streak + Monthly skeleton */}
            <div className="sk-grid-2" style={{ marginBottom: 16 }}>
              <div className="sk-card">
                <Sk w={130} h={13} style={{ marginBottom: 18 }} />
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 18 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Sk w={44} h={28} />
                      <Sk w={60} h={9} />
                    </div>
                  ))}
                </div>
                <Sk w="100%" h={34} style={{ borderRadius: 8 }} />
              </div>
              <div className="sk-card">
                <Sk w={110} h={13} style={{ marginBottom: 14 }} />
                <Sk w="100%" h={7} style={{ marginBottom: 8 }} />
                <Sk w="55%" h={9} style={{ marginBottom: 14 }} />
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Sk w={32} h={20} />
                      <Sk w={48} h={8} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Analytics cards skeleton */}
            <div className="sk-grid-4" style={{ marginBottom: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="sk-card">
                  <Sk w={90} h={12} style={{ marginBottom: 12 }} />
                  <Sk w={52} h={28} style={{ marginBottom: 10 }} />
                  <Sk w="75%" h={9} style={{ marginBottom: 6 }} />
                  <Sk w="55%" h={9} />
                </div>
              ))}
            </div>
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
      <div className="app app-ready">
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
              Your Personal DSA Growth Engine
              <span className="live-indicator" title="All stats update in real-time">
                <span className="live-dot"></span> 🟢 Real-time Sync
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
              className={`btn-admin-lock ${isAdminUnlocked ? 'unlocked' : 'locked'}`}
              onClick={() => isAdminUnlocked ? lockAdmin() : setShowAdminModal(true)}
              title={isAdminUnlocked ? 'Admin mode active — click to lock' : 'Click to unlock admin mode'}
            >
              {isAdminUnlocked ? '🔓' : '🔒'}
            </button>
            <button 
              className="theme-toggle"
              onClick={() => setDarkMode(prev => !prev)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Navbar Stats Bar */}
        <div className="navbar-stats">
          <StatCard value={totalSolved}   label="Problems Solved" icon="✅" delay={0.05} isReady={statsReady} />
          <div className="navbar-stat-divider" />
          <StatCard value={displayActiveDays} label="Active Days"     icon="📅" delay={0.10} isReady={statsReady} />
          <div className="navbar-stat-divider" />
          <div className="navbar-stat navbar-stat-targeted">
            <span className="navbar-stat-value">{targetedProblems.list.length}</span>
            <span className="navbar-stat-label">🎯 Targeted</span>
          </div>
          <div className="navbar-stat-divider" />
          <StatCard value={totalProblems} label="Total Problems"  icon="📚" delay={0.20} isReady={statsReady} />
        </div>

        {/* Streak & Monthly Stats */}
        <div className="streak-monthly-grid fade-up fade-up-2">
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
            {/* Streak stats — read-only display, values come from DB */}
            <div className="streak-stats">
              <div className="streak-item">
                <div className="streak-value">{displayCurrentStreak}</div>
                <div className="streak-label">Current Streak</div>
              </div>
              <div className="streak-divider"></div>
              <div className="streak-item">
                <div className="streak-value">{displayMaxStreak}</div>
                <div className="streak-label">Max Streak</div>
              </div>
              <div className="streak-divider"></div>
              <div className="streak-item">
                <div className="streak-value">{displayActiveDays}</div>
                <div className="streak-label">Active Days</div>
              </div>
            </div>

            {/* Today Status */}
            <div className={`today-status ${(() => {
              const solvedToday = Object.values(solvedDates).includes(todayLocalStr);
              return solvedToday ? 'solved' : 'pending';
            })()}`}>
              {(() => {
                const solvedToday = Object.values(solvedDates).includes(todayLocalStr);
                return solvedToday
                  ? <><span className="status-icon">✅</span> Solved Today — Consistency Maintained</>
                  : <><span className="status-icon">🎯</span> Today's session pending — stay consistent</>;
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
            <h3 className="card-title">📅 Monthly Planner</h3>

            {/* ── SECTION 1: Progress Overview ── */}
            <div className="mp-section">
              <div className="mp-month-row">
                <span className="mp-month-name">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                {bestMonth && (
                  <span className="best-month-badge">🏆 Best: {new Date(bestMonth.year, bestMonth.month).toLocaleDateString('en-US', { month: 'short' })} ({bestMonth.count})</span>
                )}
              </div>
              {targetSuggestion.hasData ? (
                <>
                  {/* Progress bar */}
                  <div className="mp-progress-bar-track">
                    <div
                      className="mp-progress-bar-fill"
                      style={{ width: `${Math.min(100, Math.round((currentMonthStats.count / targetSuggestion.moderateMonthlyTarget) * 100))}%` }}
                    />
                  </div>
                  <div className="mp-progress-label">
                    <span><strong style={{ color: 'var(--primary)' }}>{currentMonthStats.count}</strong> / {targetSuggestion.moderateMonthlyTarget} solved</span>
                    <span style={{ color: 'var(--text-muted)' }}>{Math.min(100, Math.round((currentMonthStats.count / targetSuggestion.moderateMonthlyTarget) * 100))}%</span>
                  </div>
                  {/* Mini stats row */}
                  <div className="mp-stats-row">
                    <div className="mp-stat">
                      <span className="mp-stat-val">{targetSuggestion.avgLast30}</span>
                      <span className="mp-stat-lbl">avg/day</span>
                    </div>
                    <div className="mp-stat-divider" />
                    <div className="mp-stat">
                      <span className="mp-stat-val" style={{ color: parseFloat(targetSuggestion.dailyRequired) > parseFloat(targetSuggestion.avgLast30) ? 'var(--warning, #f59e0b)' : 'var(--success)' }}>
                        {targetSuggestion.dailyRequired}
                      </span>
                      <span className="mp-stat-lbl">needed/day</span>
                    </div>
                    <div className="mp-stat-divider" />
                    <div className="mp-stat">
                      <span className="mp-stat-val">{targetSuggestion.remainingDays}</span>
                      <span className="mp-stat-lbl">days left</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                  <strong style={{ color: 'var(--primary)' }}>{currentMonthStats.count}</strong> solved · Need 7+ days of data for targets
                </div>
              )}
            </div>

            {/* ── SECTION 2: Today's Plan (primary focus) ── */}
            {targetSuggestion.hasData && (() => {
              const solveTarget = Math.max(1, Math.ceil(parseFloat(targetSuggestion.dailyRequired)));
              const reviseTarget = Math.min(3, targetedProblems.list.length);
              const focusTopics = weaknessAnalysis.slice(0, 2).map(w => w.topic);
              return (
                <div className="mp-today-plan">
                  <div className="mp-today-title">🎯 Today's Plan</div>
                  <div className="mp-today-numbers">
                    <div className="mp-today-num">
                      <span className="mp-today-big">{solveTarget}</span>
                      <span className="mp-today-sub">solve</span>
                    </div>
                    <div className="mp-today-sep">·</div>
                    <div className="mp-today-num">
                      <span className="mp-today-big">{reviseTarget}</span>
                      <span className="mp-today-sub">revise</span>
                    </div>
                  </div>
                  {focusTopics.length > 0 && (
                    <div className="mp-today-focus">
                      Focus: {focusTopics.join(' · ')}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── SECTION 3: Action Insights ── */}
            {(() => {
              const urgent = [], improve = [], positive = [];

              weaknessAnalysis.filter(w => w.daysSinceLast >= 14).slice(0, 2)
                .forEach(w => urgent.push(`${w.topic} inactive ${w.daysSinceLast}d`));

              if (weeklyPerformance.lastWeek > 0 && weeklyPerformance.change < -20)
                improve.push(`Solving ↓${Math.abs(weeklyPerformance.change)}% this week`);

              const totalD = easyCount + mediumCount + hardCount;
              if (totalD > 0 && hardCount / totalD < 0.1)
                improve.push(`Only ${Math.round((hardCount / totalD) * 100)}% Hard problems`);

              if (consistencyScore.score >= 70)
                positive.push(`${consistencyScore.score}% consistency`);
              if (weeklyPerformance.change > 20)
                positive.push(`Solving ↑${weeklyPerformance.change}% this week`);

              const hasAny = urgent.length || improve.length || positive.length;
              if (!hasAny) return null;

              return (
                <div className="mp-section mp-insights">
                  <div className="mp-insights-title">Insights</div>
                  {urgent.map((m, i) => (
                    <div key={`u${i}`} className="mp-insight-row mp-insight-urgent">🔥 {m}</div>
                  ))}
                  {improve.map((m, i) => (
                    <div key={`i${i}`} className="mp-insight-row mp-insight-improve">⚠️ {m}</div>
                  ))}
                  {positive.map((m, i) => (
                    <div key={`p${i}`} className="mp-insight-row mp-insight-positive">🟢 {m}</div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Advanced Analytics Grid */}
        <div className="advanced-analytics-grid fade-up fade-up-3">
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
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">{consistencyScore.firstDate}</span>
                </div>
                <div className="consistency-detail-item">
                  <span className="detail-label">Days Tracked</span>
                  <span className="detail-value">{consistencyScore.totalDaysTracked}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="analytics-card weekly-card">
            <h3 className="card-title">📊 Weekly Performance</h3>
            <div className="compact-card-body">
              <div className="compact-main-row">
                <div className="compact-stat">
                  <span className="compact-big">{weeklyPerformance.thisWeek}</span>
                  <span className="compact-lbl">this week</span>
                </div>
                <div className="compact-divider" />
                <div className="compact-stat">
                  <span className="compact-big">{weeklyPerformance.lastWeek}</span>
                  <span className="compact-lbl">last week</span>
                </div>
              </div>
              <div className="compact-sub-row">
                <span style={{ color: weeklyPerformance.change > 0 ? 'var(--success)' : weeklyPerformance.change < 0 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 700 }}>
                  {weeklyPerformance.trend} {weeklyPerformance.change > 0 ? '+' : ''}{weeklyPerformance.change}%
                </span>
                <span className="compact-context">{weeklyPerformance.contextLabel}</span>
              </div>
              <div className="compact-sub-row">
                <span className="compact-muted">Avg this week:</span>
                <span className="compact-muted-val">{weeklyPerformance.thisWeekAvgPerDay}/day</span>
              </div>
            </div>
          </div>

          {/* Daily Average */}
          <div className="analytics-card daily-avg-card">
            <h3 className="card-title">📈 Daily Average</h3>
            <div className="compact-card-body">
              <div className="compact-hero">
                <span className="compact-hero-num">{dailyAverage.overallAvg}</span>
                <span className="compact-hero-sub">overall avg/active day</span>
              </div>
              <div className="compact-sub-row">
                <span className="compact-muted">Last 7d:</span>
                <span className="compact-muted-val">{dailyAverage.last7Avg}</span>
              </div>
              <div className="compact-sub-row">
                <span className="compact-muted">Last 30d:</span>
                <span className="compact-muted-val">{dailyAverage.last30Avg}</span>
              </div>
              <div className="compact-sub-row">
                <span style={{ color: dailyAverage.trend === 'Improving' ? 'var(--success)' : dailyAverage.trend === 'Declining' ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem' }}>
                  {dailyAverage.arrow} {dailyAverage.trend}
                </span>
              </div>
            </div>
          </div>

          {/* Strongest Day */}
          <div className="analytics-card strongest-day-card">
            <h3 className="card-title">🔥 Best Day Record</h3>
            <div className="compact-card-body">
              <div className="compact-hero">
                <span className="compact-hero-num" style={{ background: 'linear-gradient(135deg, var(--warning), #F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {strongestDay.count}
                </span>
                <span className="compact-hero-sub">problems in one day</span>
              </div>
              {strongestDay.topDays.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div className="compact-muted" style={{ marginBottom: '4px' }}>Top days:</div>
                  {strongestDay.topDays.map((d, i) => (
                    <div key={i} className="compact-sub-row">
                      <span className="compact-muted">{d.label}</span>
                      <span className="compact-muted-val">{d.count} solved</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Striver Progress Card — ABOVE Needs Revision */}
        <div className="analytics-card striver-card fade-up fade-up-4">
          <h3 className="card-title">📘 Striver Progress</h3>
          <div className="striver-stats">
            <div className="striver-stat-row">
              <span className="striver-dot easy"></span>
              <span className="striver-label">Easy</span>
              <span className="striver-value">{striverStats.easy}</span>
            </div>
            <div className="striver-stat-row">
              <span className="striver-dot medium"></span>
              <span className="striver-label">Medium</span>
              <span className="striver-value">{striverStats.medium}</span>
            </div>
            <div className="striver-stat-row">
              <span className="striver-dot hard"></span>
              <span className="striver-label">Hard</span>
              <span className="striver-value">{striverStats.hard}</span>
            </div>
            <div className="striver-stat-row striver-total-row">
              <span className="striver-dot total"></span>
              <span className="striver-label">Total Solved</span>
              <span className="striver-value striver-total">{striverStats.total}</span>
            </div>
          </div>
          {striverStats.total === 0 && (
            <div className="striver-empty">Click 📘 on any problem in the table to mark it as Striver</div>
          )}
        </div>

        {/* Needs Revision — problems with revisionCount > 0, sorted by most recently revised */}
        <ProblemSection
          title="🔁 Needs Revision"
          items={intelligentRevision}
          variant="revision"
          emptyIcon="🎉"
          emptyMsg="No problems need revision yet"
          emptyHint="Start revising solved problems to track them here"
          onRevise={handleRevise}
          revisingId={revisingId}
          formatDate={formatDate}
          onUserDiffChange={handleUserDifficultyChange}
        />

        {/* Recently Solved — latest 9 */}
        {(() => {
          const recentProblems = [...allProblems]
            .filter(p => p.status === 'Done')
            .sort((a, b) => new Date(b._solvedDateISO || 0) - new Date(a._solvedDateISO || 0))
            .slice(0, 9);
          return (
            <ProblemSection
              title="🆕 Recently Solved"
              items={recentProblems}
              variant="solved"
              emptyIcon="📚"
              emptyMsg="No solved problems yet"
              emptyHint="Start solving to see activity here"
              onRevise={handleRevise}
              revisingId={revisingId}
              formatDate={formatDate}
              onUserDiffChange={handleUserDifficultyChange}
            />
          );
        })()}

        {/* Targeted Problems — manually marked by user */}
        {(() => {
          const list = targetedProblems.list;
          return (
            <ProblemSection
              title="🎯 Targeted Problems"
              items={list}
              variant="targeted"
              emptyIcon="🎯"
              emptyMsg="No targeted problems yet"
              emptyHint="Click the 🎯 button on any problem in the table below to add it here"
              onRevise={handleRevise}
              revisingId={revisingId}
              formatDate={formatDate}
              onUserDiffChange={handleUserDifficultyChange}
              onTarget={handleToggleTarget}
              targetingId={targetingId}
            />
          );
        })()}

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
                  placeholder="Search name, #ID, difficulty..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="filter-input"
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
                <option>Targeted</option>
                <option>Striver</option>
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
                  ✕ Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Problem List — desktop table + mobile cards */}
        <div className="table-card">
          <div className="table-header">
            <h3>Problem List</h3>
            <span className="table-count">{filteredProblems.length} problems</span>
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className="table-wrapper">
            <table className="problems-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>My Difficulty</th>
                  <th>Rev</th>
                  <th>Solved On</th>
                  <th>Last Revised</th>
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
                          className={`difficulty-select difficulty-${(problem.userDifficulty || problem.difficulty || 'medium').toLowerCase()}`}
                          value={problem.userDifficulty || problem.difficulty || 'Medium'}
                          onChange={(e) => handleUserDifficultyChange(problem.number, e.target.value)}
                          title="How hard did you find this?"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`rev-chip${(problem.revisionCount || 0) === 0 ? ' zero' : ''}`}>
                            {problem.revisionCount || 0}×
                          </span>
                          <div className="rev-controls">
                            <button
                              className="rev-btn"
                              onClick={() => handleUnrevise(problem.number)}
                              disabled={(problem.revisionCount || 0) === 0 || unrevisingId === problem.number}
                              title="Remove revision"
                            >−</button>
                            <button
                              className="rev-btn"
                              onClick={() => handleRevise(problem.number)}
                              disabled={revisingId === problem.number}
                              title="Add revision"
                            >+</button>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {problem.status === 'Done' ? formatDate(problem._solvedDateISO) : '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {(problem.revisionCount || 0) === 0 ? '—' : formatDate(problem.lastRevisedAt)}
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
                          <button
                            className={`btn-target${problem.targeted ? ' active' : ''}`}
                            onClick={() => handleToggleTarget(problem.number)}
                            disabled={targetingId === problem.number}
                            title={problem.targeted ? 'Remove from Targeted' : 'Add to Targeted'}
                          >
                            {targetingId === problem.number ? '⏳' : '🎯'}
                          </button>
                          <button
                            className={`btn-striver${problem.isStriver ? ' active' : ''}`}
                            onClick={() => handleToggleStriver(problem.number)}
                            disabled={striverId === problem.number}
                            title={problem.isStriver ? 'Remove from Striver' : 'Mark as Striver'}
                          >
                            {striverId === problem.number ? '⏳' : '📘'}
                          </button>
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
                    <td colSpan="10" className="empty-state">
                      {allProblems.length === 0 ? (
                        <>
                          <div className="empty-icon">📚</div>
                          <p className="empty-title">No Problems Yet</p>
                          <small>Click "Add Problem" to start tracking your LeetCode journey</small>
                        </>
                      ) : (
                        <>
                          <div className="empty-icon">🔍</div>
                          <p className="empty-title">No results found</p>
                          <small>
                            {debouncedSearch
                              ? `No problems match "${debouncedSearch}" — try a different name, ID, or difficulty`
                              : 'Try adjusting your filters'}
                          </small>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div className="problems-mobile">
            {filteredProblems.length > 0 ? (
              filteredProblems.map(problem => (
                <div key={problem.number} className="pm-card" data-problem-number={problem.number}>
                  {/* Row 1: number + badges */}
                  <div className="pm-top">
                    <span className="pm-number">#{problem.number}</span>
                    <span className={`badge badge-${(problem.difficulty || 'medium').toLowerCase()}`}>
                      {problem.difficulty}
                    </span>
                    {problem.status === 'Done' && problem._solvedDateISO && (
                      <span className="pm-date">📅 {formatDate(problem._solvedDateISO)}</span>
                    )}
                    {problem.targeted && <span className="pm-tag pm-tag-target">🎯</span>}
                    {problem.isStriver && <span className="pm-tag pm-tag-striver">📘</span>}
                  </div>

                  {/* Row 2: title */}
                  <div className="pm-title">{problem.title}</div>

                  {/* Row 3: revision count */}
                  <div className="pm-meta">
                    <span className={`rev-chip${(problem.revisionCount || 0) === 0 ? ' zero' : ''}`}>
                      🔁 {problem.revisionCount || 0}×
                    </span>
                    {(problem.revisionCount || 0) > 0 && problem.lastRevisedAt && (
                      <span className="pm-date">Last: {formatDate(problem.lastRevisedAt)}</span>
                    )}
                  </div>

                  {/* Row 4: primary actions */}
                  <div className="pm-actions-primary">
                    <a
                      href={problem.link || `https://leetcode.com/problems/${problem.number}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pm-btn pm-btn-open"
                    >🔗 Open</a>
                    <select
                      className={`pm-status-select status-${(problem.status || 'not-started').toLowerCase().replace(' ', '-')}`}
                      value={problem.status}
                      onChange={(e) => handleStatusChange(problem.number, e.target.value)}
                    >
                      <option>Not Started</option>
                      <option>In Progress</option>
                      <option>Done</option>
                    </select>
                  </div>

                  {/* Row 5: secondary actions */}
                  <div className="pm-actions-secondary">
                    <select
                      className={`pm-diff-select difficulty-${(problem.userDifficulty || problem.difficulty || 'medium').toLowerCase()}`}
                      value={problem.userDifficulty || problem.difficulty || 'Medium'}
                      onChange={(e) => handleUserDifficultyChange(problem.number, e.target.value)}
                      title="Your experience"
                    >
                      <option value="Easy">Easy ✓</option>
                      <option value="Medium">Medium ~</option>
                      <option value="Hard">Hard ✗</option>
                    </select>
                    <div className="pm-rev-controls">
                      <button
                        className="rev-btn"
                        onClick={() => handleUnrevise(problem.number)}
                        disabled={(problem.revisionCount || 0) === 0 || unrevisingId === problem.number}
                        title="Remove revision"
                      >−</button>
                      <span className="pm-rev-label">Rev</span>
                      <button
                        className="rev-btn"
                        onClick={() => handleRevise(problem.number)}
                        disabled={revisingId === problem.number}
                        title="Add revision"
                      >+</button>
                    </div>
                    <button
                      className={`btn-target${problem.targeted ? ' active' : ''}`}
                      onClick={() => handleToggleTarget(problem.number)}
                      disabled={targetingId === problem.number}
                      title={problem.targeted ? 'Remove from Targeted' : 'Add to Targeted'}
                    >
                      {targetingId === problem.number ? '⏳' : '🎯'}
                    </button>
                    <button
                      className={`btn-striver${problem.isStriver ? ' active' : ''}`}
                      onClick={() => handleToggleStriver(problem.number)}
                      disabled={striverId === problem.number}
                      title={problem.isStriver ? 'Remove from Striver' : 'Mark as Striver'}
                    >
                      {striverId === problem.number ? '⏳' : '📘'}
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(problem.number, problem.isCustom)}
                      title="Delete problem"
                    >🗑️</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="pm-empty">
                <div className="empty-icon">{allProblems.length === 0 ? '📚' : '🔍'}</div>
                <p>{allProblems.length === 0 ? 'No Problems Yet' : 'No results found'}</p>
                <small>{allProblems.length === 0 ? 'Click "Add Problem" to start' : 'Try adjusting your filters'}</small>
              </div>
            )}
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

      {/* Admin Auth Modal */}
      {showAdminModal && (
        <AdminModal
          adminPassword={ADMIN_PASSWORD}
          onClose={() => { setShowAdminModal(false); setPendingAction(null); }}
          onUnlock={handleAdminUnlock}
        />
      )}

      {/* Password Confirm Modal */}
      {pwModal && (
        <PwModal
          modal={pwModal}
          adminPassword={ADMIN_PASSWORD}
          onClose={closePwModal}
        />
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



      {/* Scroll buttons */}
      <div className="scroll-btns">
        {showScrollTop && (
          <button className="scroll-btn" onClick={scrollToTop} title="Back to top">↑</button>
        )}
        {showScrollBottom && (
          <button className="scroll-btn scroll-btn-down" onClick={scrollToBottom} title="Scroll to bottom">↓</button>
        )}
      </div>



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
