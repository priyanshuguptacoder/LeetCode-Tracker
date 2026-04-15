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
function ProblemCard({ p, variant, onRevise, revisingId, formatDate, onUserDiffChange, onTarget, targetingId, onClickCard }) {
  const diffLower = (p.difficulty || 'medium').toLowerCase();
  const userDiff = p.userDifficulty || p.difficulty || 'Medium';

  return (
    <div className="pc-card" onClick={variant === 'targeted' && onClickCard ? () => onClickCard(p.number) : undefined}
      style={variant === 'targeted' && onClickCard ? { cursor: 'pointer' } : {}}
      title={variant === 'targeted' ? 'Click to find in table' : undefined}
    >
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
function ProblemSection({ title, items, variant, emptyIcon, emptyMsg, emptyHint, onRevise, revisingId, formatDate, onUserDiffChange, onTarget, targetingId, onClickCard }) {
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
              onClickCard={onClickCard}
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
// DIFFICULTY NAVBAR — Easy/Medium/Hard/Total filter bar
// ============================================
function DifficultyNavbar({ easy, medium, hard, total, selectedFilter, onFilterChange }) {
  const tabs = [
    { key: 'easy', label: 'Easy', count: easy, color: '#22c55e' },
    { key: 'medium', label: 'Medium', count: medium, color: '#f59e0b' },
    { key: 'hard', label: 'Hard', count: hard, color: '#ef4444' },
    { key: 'solved', label: 'Total', count: total, color: '#6366f1' },
  ];
  return (
    <div className="diff-navbar">
      {tabs.map((t, i) => (
        <button
          key={i}
          className={`diff-nav-btn${selectedFilter === t.key ? ' active' : ''}`}
          style={{ '--diff-color': t.color }}
          onClick={() => onFilterChange(selectedFilter === t.key ? null : t.key)}
        >
          <span className="diff-nav-count">{t.count}</span>
          <span className="diff-nav-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// SUGGESTION CARD — single suggestion item
// ============================================
function SuggestionCard({ s, onClickSuggestion }) {
  const diffLower = (s.difficulty || 'medium').toLowerCase();
  return (
    <div className="sug-card" onClick={() => onClickSuggestion(s.problemId)} title="Click to find in table">
      <div className="sug-card-top">
        <span className="sug-id">#{s.problemId}</span>
        <span className={`badge badge-${diffLower}`}>{s.difficulty}</span>
      </div>
      <div className="sug-title">{s.title}</div>
      <div className="sug-meta">
        <span className="sug-topic">{s.topic}</span>
        <span className="sug-reason">{s.reason}</span>
      </div>
    </div>
  );
}

// ============================================
// SUGGESTIONS SECTION — 3 sub-sections
// ============================================
function SuggestionsSection({ suggestions, onClickSuggestion }) {
  if (!suggestions || suggestions.length === 0) return null;

  // Categorize by reason keywords — must match backend reason strings exactly
  const weakTopics = suggestions.filter(s => s.reason.startsWith('Weak in'));
  const continueList = suggestions.filter(s =>
    s.reason === 'Never revised' ||
    s.reason === 'Overdue revision' ||
    s.reason === 'Low confidence' ||
    s.reason.includes('revision') ||
    s.reason.includes('revised') ||
    s.reason.includes('confidence')
  );
  const challenge = suggestions.filter(s => s.reason === 'Challenge yourself');

  // Fallback: if categorization leaves some uncategorized, put them in weakTopics
  const categorized = new Set([...weakTopics, ...continueList, ...challenge].map(s => s.problemId));
  const uncategorized = suggestions.filter(s => !categorized.has(s.problemId));
  const allWeak = [...weakTopics, ...uncategorized];

  const Section = ({ title, items }) => {
    if (items.length === 0) return null;
    return (
      <div className="sug-section">
        <div className="sug-section-title">{title}</div>
        <div className="sug-grid">
          {items.map(s => (
            <SuggestionCard key={s.problemId} s={s} onClickSuggestion={onClickSuggestion} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="suggestions-card fade-up">
      <div className="sug-header">
        <h3 className="card-title">💡 Suggested for You</h3>
        <span className="sug-subtitle">Based on your weak topics, revision backlog, and progress</span>
      </div>
      <Section title="🧠 Weak Topics" items={allWeak} />
      <Section title="🔁 Continue Progress" items={continueList} />
      <Section title="🔥 Challenge Yourself" items={challenge} />
    </div>
  );
}
// ============================================
// MISTAKE TYPE MODAL — mandatory root cause selection
// ============================================
function MistakeTypeModal({ problemTitle, onConfirm, onClose }) {
  const [selected, setSelected] = React.useState('');
  const options = [
    { value: 'pattern_not_recognized', label: '🧩 Pattern not recognized' },
    { value: 'logic_error', label: '🐛 Logic error' },
    { value: 'edge_case_missed', label: '⚠️ Edge case missed' },
    { value: 'optimization_issue', label: '⚡ Optimization issue' },
    { value: 'forgot_approach', label: '🧠 Forgot approach' },
    { value: 'slow_execution', label: '🐢 Slow execution' },
  ];
  return (
    <div className="pw-modal-overlay">
      <div className="pw-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-icon">🔍</div>
        <h3>Why did you struggle?</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--primary)' }}>{problemTitle}</strong> was added to Needs Revision.
          Select the root cause — this cannot be skipped.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => setSelected(o.value)}
              style={{
                padding: '0.6rem 1rem', borderRadius: 8, border: '1.5px solid',
                borderColor: selected === o.value ? 'var(--primary)' : 'var(--border)',
                background: selected === o.value ? 'rgba(99,102,241,0.12)' : 'var(--bg-tertiary)',
                color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem',
                fontWeight: selected === o.value ? 700 : 400,
              }}
            >{o.label}</button>
          ))}
        </div>
        <div className="pw-modal-actions" style={{ marginTop: '1.2rem' }}>
          <button className="btn-secondary" onClick={onClose}>Skip</button>
          <button
            className="btn-confirm"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >Confirm</button>
        </div>
      </div>
    </div>
  );
}

function RevisionModeModal({ problem, onComplete, onClose }) {
  const LIMIT = 60; // ✅ changed to 60 minutes

  const [phase, setPhase] = React.useState('ready'); // ready | solving | done
  const [elapsed, setElapsed] = React.useState(0);
  const [hintsUsed, setHintsUsed] = React.useState(false);
  const [success, setSuccess] = React.useState(null);

  const timerRef = React.useRef(null);
  const startTimeRef = React.useRef(null);

  // ▶️ START TIMER
  const startTimer = () => {
    if (timerRef.current) return;

    setPhase('solving');
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const currentElapsed = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );

      if (currentElapsed >= LIMIT * 60) {
        clearInterval(timerRef.current);
        timerRef.current = null;

        setElapsed(LIMIT * 60);
        setPhase('done');
      } else {
        setElapsed(currentElapsed);
      }
    }, 1000);
  };

  // ⏹ STOP TIMER
  const stopTimer = (result) => {
    if (!startTimeRef.current) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finalElapsed = Math.floor(
      (Date.now() - startTimeRef.current) / 1000
    );

    setElapsed(Math.min(finalElapsed, LIMIT * 60));
    setSuccess(result);
    setPhase('done');
  };

  // 🧹 CLEANUP
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // ⏱ TIME CALCULATIONS
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeTakenMins = parseFloat((elapsed / 60).toFixed(1));
  const isOverTime = elapsed >= LIMIT * 60;

  // 📊 CONFIDENCE LOGIC (UPDATED)
  const confidenceLabel = () => {
    if (success && !hintsUsed) {
      if (timeTakenMins <= 20) {
        return { label: 'HIGH ✅', color: 'var(--success)' };
      }
      if (timeTakenMins <= 45) {
        return { label: 'MEDIUM ⚡', color: 'var(--warning, #f59e0b)' };
      }
    }
    return { label: 'LOW ❌', color: 'var(--danger, #ef4444)' };
  };

  return (
    <div className="pw-modal-overlay">
      <div className="pw-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        {phase === 'ready' && (
          <>
            <div className="admin-modal-icon">🔁</div>
            <h3>Revision Mode</h3>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--primary)' }}>
                {problem.title}
              </strong>
            </p>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Solve from scratch. No hints. You have <strong>60 minutes</strong>.
            </p>

            <div className="pw-modal-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>

              <a
                href={problem.link || `https://leetcode.com/problems/${problem.number}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-confirm"
                style={{ textDecoration: 'none' }}
                onClick={startTimer}
              >
                Open & Start Timer ↗
              </a>
            </div>
          </>
        )}

        {phase === 'solving' && (
          <>
            <div className="admin-modal-icon" style={{ fontSize: '2rem' }}>
              {isOverTime ? '⏰' : '⏱'}
            </div>

            <h3 style={{ color: isOverTime ? 'var(--danger)' : 'var(--text-primary)' }}>
              {isOverTime
                ? 'Time Up!'
                : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
            </h3>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {isOverTime ? 'Mark your result below.' : 'Solving from scratch — no hints allowed.'}
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={hintsUsed}
                onChange={(e) => setHintsUsed(e.target.checked)}
              />
              I used a hint
            </label>

            <div className="pw-modal-actions">
              <button className="btn-danger" onClick={() => stopTimer(false)}>❌ Failed</button>
              <button className="btn-confirm" onClick={() => stopTimer(true)}>✅ Solved</button>
            </div>
          </>
        )}

        {phase === 'done' && success !== null && (
          <>
            <div className="admin-modal-icon">{success ? '🎉' : '😓'}</div>
            <h3>{success ? 'Nice work!' : 'Keep practicing'}</h3>

            <p>
              Time: <strong>{timeTakenMins} min</strong> · Hints: <strong>{hintsUsed ? 'Yes' : 'No'}</strong>
            </p>

            <p>
              Confidence:{' '}
              <strong style={{ color: confidenceLabel().color }}>
                {confidenceLabel().label}
              </strong>
            </p>

            <div className="pw-modal-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn-confirm"
                onClick={() =>
                  onComplete({ timeTaken: timeTakenMins, hintsUsed, success })
                }
              >
                Save Result
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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

// Recompute streak/activeDays from an array of YYYY-MM-DD UTC date strings.
// Used after delete to keep dbStreak display in sync without a DB round-trip.
function computeStreakFromDates(dateStrings) {
  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];

  const daySet = new Set(dateStrings.filter(Boolean).filter(k => k <= todayKey));
  const activeDays = daySet.size;
  if (activeDays === 0) return { activeDays: 0, currentStreak: 0, maxStreak: 0 };

  const unique = [...daySet].sort();

  // Longest streak
  let maxStreak = 1, tempStreak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = Math.round(
      (new Date(unique[i] + 'T00:00:00Z') - new Date(unique[i - 1] + 'T00:00:00Z')) / 86400000
    );
    if (diff === 1) { tempStreak++; maxStreak = Math.max(maxStreak, tempStreak); }
    else { maxStreak = Math.max(maxStreak, tempStreak); tempStreak = 1; }
  }
  maxStreak = Math.max(maxStreak, tempStreak);

  // Current streak — alive if solved today OR yesterday
  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const startCursor = daySet.has(todayKey) ? todayKey : (daySet.has(yesterdayKey) ? yesterdayKey : null);
  let currentStreak = 0;
  if (startCursor) {
    let cursor = new Date(startCursor + 'T00:00:00Z');
    while (true) {
      const key = cursor.toISOString().split('T')[0];
      if (daySet.has(key)) { currentStreak++; cursor = new Date(cursor - 86400000); }
      else break;
    }
  }

  return { activeDays, currentStreak, maxStreak };
}

// ProgressCard — unified Striver / TLE sheet progress display
// Always renders — never returns null even if data is missing
function ProgressCard({ data }) {
  const safe = {
    easy:        data?.easy        ?? 0,
    medium:      data?.medium      ?? 0,
    hard:        data?.hard        ?? 0,
    total:       data?.total       ?? 0,
    totalInSheet: data?.totalInSheet ?? null,
  };
  const rows = [
    { label: 'Easy',   cls: 'easy',   value: safe.easy },
    { label: 'Medium', cls: 'medium', value: safe.medium },
    { label: 'Hard',   cls: 'hard',   value: safe.hard },
  ];
  const totalLabel = safe.totalInSheet != null
    ? `${safe.total} / ${safe.totalInSheet}`
    : String(safe.total);
  return (
    <div className="striver-stats">
      {rows.map(r => (
        <div key={r.label} className="striver-stat-row">
          <span className={`striver-dot ${r.cls}`}></span>
          <span className="striver-label">{r.label}</span>
          <span className="striver-value">{r.value}</span>
        </div>
      ))}
      <div className="striver-stat-row striver-total-row">
        <span className="striver-dot total"></span>
        <span className="striver-label">{safe.totalInSheet != null ? 'Solved / Sheet' : 'Total Solved'}</span>
        <span className="striver-value striver-total">{totalLabel}</span>
      </div>
    </div>
  );
}

// WeaknessRadar removed — Topic Mastery section deleted

// ============================================
// CONTEST STATS — LC + CF contest ratings
// Safe rendering: handles null values gracefully
// ============================================
function ContestStats({ stats }) {
  if (!stats) return null;

  const lc = {
    rating:       stats.lcRating       != null ? Math.floor(stats.lcRating)       : null,
    globalRank:   stats.lcGlobalRank   ?? null,
    contestCount: stats.lcContestCount ?? null,
  };
  const cf = {
    rating:       stats.cfRating       != null ? Math.floor(stats.cfRating)       : null,
    maxRating:    stats.cfMaxRating     != null ? Math.floor(stats.cfMaxRating)    : null,
    rank:         stats.cfRank         ?? null,
    contestCount: stats.cfContestCount ?? null,
  };

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
        {value != null ? (typeof value === 'number' ? value.toLocaleString() : value) : 'N/A'}
      </span>
    </div>
  );

  return (
    <div className="analytics-card" style={{ minHeight: 'auto' }}>
      <h3 className="card-title">🏆 Contest Stats</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* LeetCode */}
        <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', fontSize: '0.88rem' }}>
            💻 LeetCode
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <Row label="Rating"      value={lc.rating} />
            <Row label="Global Rank" value={lc.globalRank} />
            <Row label="Contests"    value={lc.contestCount} />
          </div>
        </div>

        {/* Codeforces */}
        <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: '10px', fontSize: '0.88rem' }}>
            🏆 Codeforces
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <Row label="Rating"     value={cf.rating} />
            <Row label="Max Rating" value={cf.maxRating} />
            <Row label="Rank"       value={cf.rank} />
            <Row label="Contests"   value={cf.contestCount} />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  // ============================================
  // API DATA FETCHING
  // Backend is the SINGLE SOURCE OF TRUTH for all problem data.
  // All streak/activeDays/consistency are computed from problem dates.
  // ============================================

  const [apiProblems, setApiProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [striverId, setStriverId] = useState(null);
  const [tleId, setTleId] = useState(null);
  const [recentProblems, setRecentProblems] = useState([]);
  const [todayProblems, setTodayProblems] = useState([]);
  const [revisionList, setRevisionList] = useState([]);
  const [syncStatus, setSyncStatus] = useState('checking');

  // ── Difficulty navbar + suggestion state — declared early to avoid hook-order issues
  const [selectedFilter, setSelectedFilter] = useState(null); // 'easy'|'medium'|'hard'|null
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Ref to always access latest apiProblems without stale closure issues
  const apiProblemsRef = useRef([]);
  useEffect(() => { apiProblemsRef.current = apiProblems; }, [apiProblems]);

  // ── DB-backed streak state ────────────────────────────────────────────────
  const [dbStreak, setDbStreak] = useState({
    currentStreak: 0,
    maxStreak: 0,
    activeDays: 0,
    lastSolvedDate: null,
    isSetup: false,
  });

  // ── Per-platform streak is embedded in dbStreak.lc / dbStreak.cf ────────────

  // ── Contest Stats state ────────────────────────────────────────────────────
  const [contestStats, setContestStats] = useState(null);

  const toLocalDateStr = (date) => {
    // Returns YYYY-MM-DD in UTC — matches LeetCode's day boundary (resets at 00:00 UTC)
    return new Date(date).toISOString().split('T')[0];
  };

  const parseLocalDate = (dateStr) => {
    // Parse YYYY-MM-DD as UTC midnight
    if (!dateStr) return new Date(NaN);
    return new Date(`${dateStr}T00:00:00.000Z`);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? parseLocalDate(date)
      : new Date(date);
    if (isNaN(d.getTime())) return '—';
    const todayUTC = new Date().toISOString().split('T')[0];
    const dUTC = d.toISOString().split('T')[0];
    const days = Math.round((new Date(todayUTC + 'T00:00:00Z') - new Date(dUTC + 'T00:00:00Z')) / 86400000);
    if (days === 0) return 'Today';
    if (days <= 7) return `${days}d ago`;
    return d.toLocaleString('en-US', { timeZone: 'UTC', day: '2-digit', month: 'short', year: '2-digit' });
  };

  const todayLocalStr = new Date().toISOString().split('T')[0];

  // Parse "DD-MMM" → local date string "YYYY-MM-DD"
  const MONTH_MAP = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const parseDDMMM = (str) => {
    if (!str) return null;
    const [day, mon] = str.split('-');
    if (!MONTH_MAP[mon]) return null;
    const year = new Date().getFullYear();
    return `${year}-${MONTH_MAP[mon]}-${day.padStart(2, '0')}`;
  };

  // ============================================
  // TOPIC MAP — Curated LeetCode tags per problem ID
  // ============================================
  const TOPIC_MAP = {
    1: ["Array", "Hash Table"], 2: ["Linked List", "Math"], 3: ["Sliding Window", "Hash Table"], 5: ["Dynamic Programming", "String"],
    7: ["Math"], 8: ["String"], 9: ["Math"], 11: ["Two Pointers", "Greedy"], 13: ["Math", "String"], 14: ["String"],
    15: ["Two Pointers", "Sorting"], 16: ["Two Pointers", "Sorting"], 17: ["Backtracking", "String"], 18: ["Two Pointers", "Sorting"],
    19: ["Linked List", "Two Pointers"], 20: ["Stack", "String"], 21: ["Linked List"], 22: ["Backtracking", "Dynamic Programming"],
    24: ["Linked List"], 25: ["Linked List"], 26: ["Array", "Two Pointers"], 27: ["Array", "Two Pointers"],
    29: ["Math", "Bit Manipulation"], 30: ["Sliding Window", "Hash Table", "String"], 31: ["Array", "Two Pointers"],
    33: ["Binary Search", "Array"], 34: ["Binary Search", "Array"], 35: ["Binary Search"], 36: ["Matrix", "Hash Table"],
    37: ["Backtracking", "Matrix"], 39: ["Backtracking", "Array"], 40: ["Backtracking", "Array"], 42: ["Two Pointers", "Stack", "Dynamic Programming"],
    46: ["Backtracking", "Array"], 48: ["Matrix", "Array"], 49: ["Hash Table", "String", "Sorting"], 50: ["Math", "Recursion"],
    51: ["Backtracking"], 53: ["Dynamic Programming", "Array"], 54: ["Matrix", "Array"], 56: ["Array", "Sorting"],
    57: ["Array", "Sorting"], 58: ["String"], 61: ["Linked List"], 66: ["Array", "Math"], 69: ["Binary Search", "Math"],
    70: ["Dynamic Programming", "Math"], 71: ["Stack", "String"], 73: ["Matrix", "Array"], 74: ["Binary Search", "Matrix"],
    75: ["Two Pointers", "Array", "Sorting"], 76: ["Sliding Window", "Hash Table", "String"], 77: ["Backtracking"],
    78: ["Backtracking", "Bit Manipulation", "Array"], 81: ["Binary Search", "Array"], 82: ["Linked List"],
    83: ["Linked List"], 84: ["Stack", "Array"], 85: ["Stack", "Dynamic Programming", "Matrix"], 86: ["Linked List", "Two Pointers"],
    88: ["Array", "Two Pointers", "Sorting"], 90: ["Backtracking", "Array"], 92: ["Linked List"], 118: ["Array", "Dynamic Programming"],
    121: ["Array", "Dynamic Programming"], 125: ["Two Pointers", "String"], 128: ["Array", "Hash Table"], 131: ["Backtracking", "Dynamic Programming", "String"],
    136: ["Bit Manipulation", "Array"], 137: ["Bit Manipulation", "Array"], 138: ["Linked List", "Hash Table"],
    141: ["Linked List", "Two Pointers"], 142: ["Linked List", "Two Pointers"], 143: ["Linked List"], 146: ["Design", "Hash Table", "Linked List"],
    148: ["Linked List", "Sorting"], 150: ["Stack", "Math"], 151: ["String", "Two Pointers"], 152: ["Array", "Dynamic Programming"],
    153: ["Binary Search", "Array"], 154: ["Binary Search", "Array"], 155: ["Stack", "Design"], 160: ["Linked List", "Two Pointers"],
    162: ["Binary Search", "Array"], 167: ["Two Pointers", "Array", "Binary Search"], 169: ["Array", "Hash Table"], 189: ["Array", "Two Pointers"],
    204: ["Math"], 205: ["Hash Table", "String"], 206: ["Linked List"], 209: ["Sliding Window", "Array", "Binary Search", "Prefix Sum"],
    216: ["Backtracking", "Array"], 217: ["Array", "Hash Table", "Sorting"], 219: ["Array", "Hash Table", "Sliding Window"],
    225: ["Stack", "Design", "Queue"], 231: ["Bit Manipulation", "Math"], 232: ["Stack", "Design", "Queue"], 234: ["Linked List", "Two Pointers"],
    237: ["Linked List"], 238: ["Array", "Prefix Sum"], 239: ["Sliding Window", "Queue", "Heap"], 240: ["Binary Search", "Matrix"],
    242: ["Hash Table", "String", "Sorting"], 258: ["Math"], 268: ["Array", "Math", "Bit Manipulation"], 278: ["Binary Search"],
    287: ["Two Pointers", "Binary Search", "Array"], 326: ["Math"], 328: ["Linked List"], 344: ["Two Pointers", "String"],
    349: ["Array", "Hash Table", "Sorting"], 367: ["Binary Search", "Math"], 374: ["Binary Search"], 387: ["Hash Table", "String", "Queue"],
    394: ["Stack", "String"], 395: ["Sliding Window", "Hash Table", "String"], 402: ["Stack", "Greedy", "String"],
    409: ["Hash Table", "String", "Greedy"], 410: ["Binary Search", "Array", "Dynamic Programming", "Greedy"], 412: ["Math", "String"],
    415: ["Math", "String"], 424: ["Sliding Window", "Hash Table", "String"], 430: ["Linked List"],
    438: ["Sliding Window", "Hash Table", "String"], 442: ["Array", "Hash Table"], 443: ["Two Pointers", "String"],
    451: ["Hash Table", "String", "Sorting", "Heap"], 485: ["Array"], 496: ["Stack", "Array"], 503: ["Stack", "Array"],
    509: ["Dynamic Programming", "Math"], 523: ["Array", "Hash Table", "Math", "Prefix Sum"], 525: ["Array", "Hash Table", "Prefix Sum"],
    540: ["Binary Search", "Array"], 560: ["Array", "Hash Table", "Prefix Sum"], 567: ["Sliding Window", "Hash Table", "String"],
    581: ["Array", "Sorting", "Stack"], 622: ["Design", "Queue", "Array"], 628: ["Array", "Math", "Sorting"], 633: ["Two Pointers", "Binary Search", "Math"],
    682: ["Stack", "Array"], 704: ["Binary Search", "Array"], 713: ["Sliding Window", "Array"], 724: ["Array", "Prefix Sum"],
    728: ["Math"], 735: ["Stack", "Array"], 739: ["Stack", "Array"], 796: ["String"], 844: ["Two Pointers", "String", "Stack"],
    852: ["Binary Search", "Array"], 853: ["Stack", "Sorting"], 875: ["Binary Search", "Array"], 876: ["Linked List", "Two Pointers"],
    901: ["Stack"], 907: ["Stack", "Array", "Dynamic Programming"], 912: ["Array", "Sorting"], 930: ["Sliding Window", "Array", "Hash Table", "Prefix Sum"],
    933: ["Design", "Queue"], 974: ["Array", "Hash Table", "Prefix Sum"], 992: ["Sliding Window", "Hash Table"],
    1004: ["Sliding Window", "Array", "Binary Search", "Prefix Sum"], 1009: ["Bit Manipulation"], 1011: ["Binary Search", "Array", "Greedy"],
    1021: ["Stack", "String"], 1047: ["Stack", "String"], 1089: ["Array"], 1248: ["Sliding Window", "Math", "Hash Table"],
    1281: ["Math"], 1283: ["Binary Search", "Array"], 1290: ["Linked List", "Math"], 1358: ["Sliding Window", "Hash Table", "String"],
    1423: ["Sliding Window", "Array", "Greedy", "Prefix Sum"], 1482: ["Binary Search", "Array"], 1486: ["Bit Manipulation", "Math", "Array"],
    1492: ["Math"], 1512: ["Array", "Hash Table", "Math"], 1523: ["Math"], 1539: ["Binary Search", "Array"],
    1572: ["Matrix", "Array"], 1614: ["Stack", "String"], 1657: ["Hash Table", "String", "Sorting"], 1672: ["Array", "Matrix"],
    1700: ["Queue", "Stack"], 1752: ["Array"], 1781: ["Hash Table", "String"], 1901: ["Binary Search", "Matrix"],
    1903: ["Math", "String", "Greedy"], 1910: ["String"], 1920: ["Array"], 1922: ["Math"], 1929: ["Array"],
    2011: ["String"], 2073: ["Queue"], 2095: ["Linked List", "Two Pointers"], 2104: ["Stack", "Array"],
    2149: ["Array", "Two Pointers", "Sorting"], 2220: ["Bit Manipulation"], 2235: ["Math"], 2427: ["Math"],
    2469: ["Math"], 2520: ["Math"], 2596: ["Matrix"], 2894: ["Math"], 2965: ["Array", "Matrix", "Hash Table"],
    3467: ["Array", "Sorting"], 3701: ["Sliding Window", "Hash Table", "String"]
  };

  const getTopicsForProblem = (p) => {
    // Safe string conversion — never call .replace() on non-string
    const safeUniqueId = typeof p.uniqueId === 'string' ? p.uniqueId
      : typeof p.id === 'string' ? p.id
      : String(p.uniqueId || p.id || '');
    if (!safeUniqueId && !p.problemIdNum && !p.topics?.length) return ['Miscellaneous'];
    const num = p.problemIdNum || parseInt(safeUniqueId.replace(/\D/g, ''), 10) || 0;
    if (TOPIC_MAP[num]) return TOPIC_MAP[num];
    if (p.topics && p.topics.length > 0) return p.topics;
    return [p.pattern || 'Miscellaneous'];
  };

  // ── Display ID: separate from title, used in table and mobile card ──────────
  const getDisplayId = (p) => {
    if (p.platform === 'CF') {
      const cid = p.contestId || '';
      const idx = p.index || '';
      return cid && idx ? `${cid}${idx}` : (p.uniqueId || '');
    }
    const num = p.problemIdNum;
    return num ? `#${num}` : (p.uniqueId || '');
  };

  // Transform MongoDB schema → frontend schema
  const transformProblems = (data) => (data || []).map(p => {
    if (!p) return null;
    // Hard assertions — log corrupt docs but never skip them
    if (!p.uniqueId && !p.id) { console.error('[TRANSFORM] doc with no uniqueId/id', p); }
    if (!p.platform) { console.warn('[TRANSFORM] doc missing platform, defaulting to LC:', p.uniqueId || p.id || p.problemIdNum); }
    const solvedDateISO = p.solvedDate
      ? toLocalDateStr(new Date(p.solvedDate))
      : parseDDMMM(p.date);
    const topics = getTopicsForProblem(p);
    const status = p.solved ? 'Done' : p.inProgress ? 'In Progress' : 'Not Started';

    return {
      ...p,
      // Normalize IDs to strings defensively
      uniqueId: String(p.uniqueId || p.id || ''),
      id: String(p.id || p.uniqueId || ''),
      // number: stable key used by handlers — LC=numeric, CF=uniqueId string
      number: (() => {
        const rawId = String(p.uniqueId || p.id || '');
        if (p.platform === 'CF' || rawId.startsWith('CF-')) {
          return rawId;
        }
        if (p.problemIdNum) return p.problemIdNum;
        // Extract from uniqueId "LC-63" → 63, or legacy numeric id "63" → 63
        const m = rawId.match(/^(?:LC-)?(\d+)$/);
        return m ? parseInt(m[1], 10) : (parseInt(rawId, 10) || 0);
      })(),
      platform: p.platform || 'LC',
      status,
      userDifficulty: p.userDifficulty || p.difficulty || 'Medium',
      topics: topics,
      pattern: topics[0] || (p.pattern || 'Miscellaneous'),
      link: p.platformLink || p.leetcodeLink || p.link || '',
      providerTitle: p?.providerTitle || (p.platform === 'CF' ? 'Codeforces' : 'LeetCode'),
      _solvedDateISO: solvedDateISO,
      submittedAt: p.submittedAt || p.solvedDate || null,
      targeted: p.targeted || false,
      isStriver: p.isStriver || false,
      confidence: p.confidence ?? 3,
      nextRevisionAt: p.nextRevisionAt || null,
      needsRevision: p.needsRevision || false,
      solveTime: p.solveTime || null,
      hintsUsed: p.hintsUsed || false,
      wrongAttempts: p.wrongAttempts || 0,
      mistakeType: p.mistakeType || null,
      lastRevisionSuccess: p.lastRevisionSuccess ?? null,
      lastRevisionTime: p.lastRevisionTime || null,
      consecutiveSuccess: p.consecutiveSuccess || 0,
      failureLoopFlagged: p.failureLoopFlagged || false,
    };
  }).filter(Boolean);

  // Fetch problems + streak from API on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Always fetch ALL problems — filteredProblems handles platform display
        const probRes = await window.API.getAllProblems({ platform: 'ALL' });
        if (probRes.success) {
          setApiProblems(transformProblems(probRes.data));
        }
        setLoading(false);
        // Fetch streak independently — never block problem display on streak failure
        try {
          const streakRes = await window.API.getStreak();
          if (streakRes.success) setDbStreak(streakRes.data);
        } catch (streakErr) {
          console.error('Streak fetch failed:', streakErr.message);
        }
        // Non-blocking secondary fetches
        try {
          const [sugRes, recentTodayRes, contestRes, striverRes, tleRes, revisionRes] = await Promise.allSettled([
            window.API.getSuggestions(),
            window.API.getRecentAndToday(),
            window.API.getContestStats(),
            window.API.getStriverStats(),
            window.API.getTLEStats(),
            window.API.getRevisionList(),
          ]);
          if (sugRes.status === 'fulfilled' && sugRes.value.success) setSuggestions(sugRes.value.data || []);
          if (recentTodayRes.status === 'fulfilled' && recentTodayRes.value.success) {
            setRecentProblems(recentTodayRes.value.recentSolved || []);
            setTodayProblems(recentTodayRes.value.todaySolved || []);
          }
          if (contestRes.status === 'fulfilled' && contestRes.value.success) {
            setContestStats(contestRes.value.data);
          }
          if (striverRes.status === 'fulfilled' && striverRes.value.success) {
            setStriverStats(prev => ({ ...prev, ...striverRes.value.data }));
          }
          if (tleRes.status === 'fulfilled' && tleRes.value.success) {
            setTleStats(prev => ({ ...prev, ...tleRes.value.data }));
          }
          if (revisionRes.status === 'fulfilled' && revisionRes.value.success) {
            setRevisionList(revisionRes.value.data || []);
          }
        } catch (_) { }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setApiError(error.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []); // fetch once on mount — filteredProblems handles platform display

  // Check LeetCode session health on mount
  useEffect(() => {
    window.API.getSyncStatus()
      .then(d => setSyncStatus(d.status === 'ok' ? 'ok' : 'expired'))
      .catch(() => setSyncStatus('expired'));
  }, []);

  // ============================================
  // LOCAL STATE — UI-only, no backend equivalent
  // All streak/activeDays/consistency are computed from problem dates.
  // ============================================

  const [state, setState] = useState({});
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
    // Clear navbar difficulty filter when user starts typing — prevents silent AND-kill
    if (val.trim() !== '') setSelectedFilter(null);
  };
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [patternFilter, setPatternFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('ALL'); // 'ALL' | 'LC' | 'CF'
  const [viewMode, setViewMode] = useState('ALL'); // 'ALL' | 'STRIVER' | 'TLE' (kept for future use)
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [syncing, setSyncing] = useState(false);

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
    link: '',
    solveTime: '',
    hintsUsed: false,
    wrongAttempts: '',
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
      const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = d.getUTCDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day; // shift to Monday
      d.setUTCDate(d.getUTCDate() + diff);
      return d;
    };

    const thisMonday = getMondayOf(new Date());
    const lastMonday = new Date(thisMonday);
    lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);
    const lastSunday = new Date(thisMonday); // exclusive end of last week

    let thisWeekCount = 0;
    let lastWeekCount = 0;
    const thisWeekDays = new Set();

    problems.forEach(problem => {
      if (problem && problem.status === 'Done' && problem.number && solvedDates[problem.number]) {
        const solvedDate = parseLocalDate(solvedDates[problem.number]);
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
    const last7Start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 7));
    const prev7Start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 14));

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
    const last30Start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 30));
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
      label: new Date(date).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }),
    }));

    return {
      count: topDays[0]?.count || 0,
      date: topDays[0]
        ? new Date(sorted[0][0]).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
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
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const totalDaysTracked = Math.max(1, Math.ceil((today - firstDate) / 86400000) + 1);

    // Hide section entirely if less than 7 days of data
    if (totalDaysTracked < 7) {
      return { hasData: false };
    }

    const last30Start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 30));
    const currentMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));

    let last30Count = 0;
    let currentMonthCount = 0;
    let lastMonthCount = 0;

    problems.forEach(p => {
      if (p.status === 'Done' && solvedDates[p.number]) {
        const d = parseLocalDate(solvedDates[p.number]);
        if (d >= last30Start) last30Count++;
        if (d >= currentMonthStart) currentMonthCount++;
        if (d >= lastMonthStart && d < currentMonthStart) lastMonthCount++;
      }
    });

    const avgLast30 = last30Count / 30;
    const moderate = (avgLast30 * 1.2).toFixed(1);
    const aggressive = (avgLast30 * 1.5).toFixed(1);

    // Phase 8: daily required to hit moderate monthly target
    const daysInMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
    const dayOfMonth = today.getUTCDate();
    const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1); // include today
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
    // Sort by date to ensure if multiple problems are solved on same day, the latest one is kept in map (though date is key)
    const sorted = [...apiProblems].sort((a,b) => new Date(a.submittedAt || a._solvedDateISO) - new Date(b.submittedAt || b._solvedDateISO));
    sorted.forEach(p => {
      if (p.status === 'Done' && p._solvedDateISO) {
        map[p.number] = p._solvedDateISO;
      }
    });
    return map;
  }, [apiProblems]);

  // Unified global activity days for streak calculation
  const globalActivityDays = React.useMemo(() => {
    const days = new Set(Object.values(solvedDates).filter(d => d));
    return [...days].sort();
  }, [solvedDates]);

  // ============================================
  // HISTORICAL DATE GENERATION (ONE-TIME)
  // ============================================

  // Historical date generation removed — real dates come from MongoDB.

  // ============================================
  // CALCULATE ANALYTICS
  // ============================================

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
  const problemExists = (number) => allProblems.some(p =>
    p.platform === 'CF'
      ? p.number === number || p.number === String(number)
      : p.number === parseInt(number, 10) || p.problemIdNum === parseInt(number, 10)
  );

  // verifyPassword removed — replaced by requireAdmin() session-based system

  // ============================================
  // NOTIFICATION SYSTEM
  // ============================================

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSyncLeetCode = async () => {
    setSyncing(true);
    try {
      const result = await window.API.syncAll();

      // If LC auth is expired we still want CF to succeed; just warn.
      const lcErr = result?.data?.lc?.problems?.error || result?.data?.lc?.contest?.error;
      if (lcErr && String(lcErr).includes('LEETCODE_SESSION_EXPIRED')) {
        setSyncStatus('expired');
        showNotification('⚠️ LeetCode session expired — update cookies on Render (CF may still sync)', 'error');
      } else {
        setSyncStatus('ok');
      }

      // Refetch after sync — do NOT clear state first (prevents flicker)
      const [probRes, recentTodayRes, streakRes, contestRes, striverRes, tleRes, revisionRes] = await Promise.allSettled([
        window.API.getAllProblems(),
        window.API.getRecentAndToday(),
        window.API.getStreak(),
        window.API.getContestStats(),
        window.API.getStriverStats(),
        window.API.getTLEStats(),
        window.API.getRevisionList(),
      ]);
      if (probRes.status === 'fulfilled' && probRes.value.success)
        setApiProblems(transformProblems(probRes.value.data));
      if (recentTodayRes.status === 'fulfilled' && recentTodayRes.value.success) {
        setRecentProblems(recentTodayRes.value.recentSolved || []);
        setTodayProblems(recentTodayRes.value.todaySolved || []);
      }
      if (streakRes.status === 'fulfilled' && streakRes.value.success)
        setDbStreak(streakRes.value.data);
      if (contestRes.status === 'fulfilled' && contestRes.value.success)
        setContestStats(contestRes.value.data);
      if (striverRes.status === 'fulfilled' && striverRes.value.success)
        setStriverStats(prev => ({ ...prev, ...striverRes.value.data }));
      if (tleRes.status === 'fulfilled' && tleRes.value.success)
        setTleStats(prev => ({ ...prev, ...tleRes.value.data }));
      if (revisionRes.status === 'fulfilled' && revisionRes.value.success)
        setRevisionList(revisionRes.value.data || []);

      showNotification('✅ Sync All complete', 'success');
    } catch (err) {
      showNotification(`❌ Network error: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ============================================
  // SMART ADD PROBLEM HANDLER
  // ============================================

  const handleAddProblem = async (e) => {
    e.preventDefault();

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

      // ── Auto-detection: should this go to Needs Revision? ──────────────
      const solveTime = formData.solveTime ? parseFloat(formData.solveTime) : null;
      const hintsUsed = formData.hintsUsed || false;
      const wrongAttempts = formData.wrongAttempts ? parseInt(formData.wrongAttempts) : 0;
      const autoRevision = formData.type === 'Solved' && (
        (solveTime != null && solveTime > 25) ||
        hintsUsed === true ||
        wrongAttempts >= 2
      );

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
        solveTime,
        hintsUsed,
        wrongAttempts,
        needsRevision: autoRevision,
      };
      try {
        const response = await window.API.createProblem(newProblem);
        if (response.success) {
          if (response.streak) setDbStreak(response.streak);
          const allProblemsResponse = await window.API.getAllProblems();
          setApiProblems(transformProblems(allProblemsResponse.data));
          // Refresh recent/today if problem was solved
          if (formData.type === 'Solved') {
            try {
              const recentTodayRes = await window.API.getRecentAndToday();
              if (recentTodayRes.success) {
                setRecentProblems(recentTodayRes.recentSolved || []);
                setTodayProblems(recentTodayRes.todaySolved || []);
              }
            } catch (_) { }
          }
          showNotification(`✅ Problem #${problemNumber} added!${formData.type === 'Solved' ? ' — Streak updated!' : ''}${autoRevision ? ' Added to Needs Revision.' : ''}`, 'success');
          setShowModal(false);
          setFormData({ number: '', title: '', difficulty: 'Medium', type: 'Solved', pattern: '', link: '', solveTime: '', hintsUsed: false, wrongAttempts: '' });
          // If auto-flagged, prompt for mistake type
          if (autoRevision) {
            setMistakeModal({ number: problemNumber, title: formData.title });
          }
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

  const handleMistakeTypeConfirm = async (mistakeType) => {
    if (!mistakeModal) return;
    try {
      await window.API.setMistakeType(mistakeModal.number, mistakeType);
      setApiProblems(prev => prev.map(p =>
        p.number === mistakeModal.number ? { ...p, mistakeType } : p
      ));
      showNotification(`Root cause saved: ${mistakeType.replace(/_/g, ' ')}`, 'success');
    } catch (err) {
      showNotification(`❌ ${err.message}`, 'error');
    } finally {
      setMistakeModal(null);
    }
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
          // Refresh recent/today if problem was marked as solved
          if (newStatus === 'Done') {
            try {
              const recentTodayRes = await window.API.getRecentAndToday();
              if (recentTodayRes.success) {
                setRecentProblems(recentTodayRes.recentSolved || []);
                setTodayProblems(recentTodayRes.todaySolved || []);
              }
            } catch (_) { }
          }
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
    const problem = apiProblemsRef.current.find(p => String(p.number) === String(number));
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
          // Remove from local state — all useMemo stats recompute automatically
          setApiProblems(prev => prev.filter(p => String(p.number) !== String(number)));
          // Refetch streak from backend (single source of truth after soft-delete + rebuild)
          if (problem && problem.status === 'Done') {
            try {
              const streakRes = await window.API.getStreak();
              if (streakRes.success) setDbStreak(streakRes.data);
            } catch (_) { }
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
  const revisingIdRef = React.useRef(null);
  const unrevisingIdRef = React.useRef(null);

  // ── Revision Intelligence Engine state ───────────────────────────────────
  const [revisionModal, setRevisionModal] = React.useState(null);   // problem being revised
  const [mistakeModal, setMistakeModal] = React.useState(null);   // { number, title } after add
  const [dailyRevisionCount, setDailyRevisionCount] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dailyRevision') || '{}');
      const today = new Date().toISOString().split('T')[0];
      return saved.date === today ? (saved.count || 0) : 0;
    } catch { return 0; }
  });
  const DAILY_REVISION_LIMIT = 5;

  const incrementDailyRevision = () => {
    const today = new Date().toISOString().split('T')[0];
    const newCount = dailyRevisionCount + 1;
    setDailyRevisionCount(newCount);
    localStorage.setItem('dailyRevision', JSON.stringify({ date: today, count: newCount }));
  };

  const handleRevise = (number) => {
    requireAdmin(() => {
      const problem = apiProblemsRef.current.find(p => String(p.number) === String(number));
      if (!problem) return;
      setRevisionModal(problem);
    });
  };

  const handleRevisionComplete = async ({ timeTaken, hintsUsed, success }) => {
    const problem = revisionModal;
    setRevisionModal(null);
    if (!problem) return;
    if (revisingIdRef.current === String(problem.number)) return;
    try {
      revisingIdRef.current = String(problem.number);
      setRevisingId(problem.number);
      const res = await window.API.reviseProblem(problem.number, { timeTaken, hintsUsed, success });
      if (res.success) {
        setApiProblems(prev => prev.map(p =>
          String(p.number) === String(problem.number)
            ? {
              ...p,
              revisionCount: res.data.revisionCount,
              lastRevisedAt: res.data.lastRevisedAt,
              nextRevisionAt: res.data.nextRevisionAt,
              confidence: res.data.confidence,
              needsRevision: res.data.needsRevision,
              consecutiveSuccess: res.data.consecutiveSuccess,
              failureLoopFlagged: res.data.failureLoopFlagged,
            }
            : p
        ));
        incrementDailyRevision();
        if (res.removed) {
          showNotification(`🏆 #${problem.number} mastered — removed from revision!`, 'success');
        } else if (res.data.failureLoopFlagged) {
          showNotification(`⚠️ Pattern not learned — study the approach again`, 'warning');
        } else {
          showNotification(`Revision recorded ✅ (${success ? 'Success' : 'Failed'})`, success ? 'success' : 'error');
        }
      }
    } catch (err) {
      showNotification(`❌ ${err.message}`, 'error');
    } finally {
      revisingIdRef.current = null;
      setRevisingId(null);
    }
  };

  const handleUnrevise = (number) => {
    requireAdmin(async () => {
      if (unrevisingIdRef.current === String(number)) return;
      try {
        unrevisingIdRef.current = String(number);
        setUnrevisingId(number);
        const res = await window.API.unreviseProblem(number);
        if (res.success) {
          setApiProblems(prev => prev.map(p =>
            String(p.number) === String(number)
              ? {
                ...p,
                revisionCount: res.data.revisionCount,
                lastRevisedAt: res.data.lastRevisedAt,
                nextRevisionAt: res.data.revisionCount === 0 ? null : p.nextRevisionAt,
                confidence: res.data.revisionCount === 0 ? 3 : p.confidence,
              }
              : p
          ));
          showNotification('Revision removed ✅', 'success');
        }
      } catch (err) {
        showNotification(`❌ ${err.message}`, 'error');
      } finally {
        unrevisingIdRef.current = null;
        setUnrevisingId(null);
      }
    });
  };

  const [targetingId, setTargetingId] = React.useState(null);

  const handleToggleTarget = (number) => {
    requireAdmin(async () => {
      const problem = apiProblemsRef.current.find(p => String(p.number) === String(number));
      const uid = problem?.uniqueId || problem?.id;
      if (!uid || targetingId === uid) return;
      // Optimistic update
      const prev = problem.targeted;
      setApiProblems(ps => ps.map(p =>
        String(p.number) === String(number) ? { ...p, targeted: !prev } : p
      ));
      try {
        setTargetingId(uid);
        const res = await window.API.toggleTarget(uid);
        if (res.success) {
          setApiProblems(ps => ps.map(p =>
            String(p.number) === String(number)
              ? { ...p, targeted: res.data.targeted, targetedAt: res.data.targetedAt }
              : p
          ));
          showNotification(
            res.data.targeted ? '🎯 Added to Targeted' : '✅ Removed from Targeted',
            'success'
          );
        } else {
          setApiProblems(ps => ps.map(p =>
            String(p.number) === String(number) ? { ...p, targeted: prev } : p
          ));
        }
      } catch (err) {
        setApiProblems(ps => ps.map(p =>
          String(p.number) === String(number) ? { ...p, targeted: prev } : p
        ));
        showNotification(`❌ ${err.message}`, 'error');
      } finally {
        setTargetingId(null);
      }
    });
  };

  // ── Pending scroll target — set by handleClickSuggestion, consumed by useEffect ──
  const [pendingScrollId, setPendingScrollId] = React.useState(null);

  // ── Click suggestion / targeted card → scroll + highlight table row ─────
  const handleClickSuggestion = (problemId) => {
    const safeId = String(problemId);
    setSelectedFilter(null);
    setDifficultyFilter('All');
    setStatusFilter('All');
    setPatternFilter('All');
    setSearchTerm('');
    setDebouncedSearch('');
    setPendingScrollId(safeId);
    setSelectedProblemId(safeId);
  };

  // ── Fire scroll after filters have cleared and DOM has updated ───────────
  React.useEffect(() => {
    if (pendingScrollId == null) return;
    // rAF ensures we're after the paint
    const raf = requestAnimationFrame(() => {
      const row = document.querySelector(`[data-problem-number="${pendingScrollId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('highlight-row');
        setTimeout(() => {
          row.classList.remove('highlight-row');
          setSelectedProblemId(null);
        }, 2500);
      }
      setPendingScrollId(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingScrollId]);

  // ── Table header scroll-elevation effect ─────────────────────────────────
  const tableHeaderRef = React.useRef(null);
  React.useEffect(() => {
    const header = tableHeaderRef.current;
    if (!header) return;
    const tableCard = header.closest('.table-card');
    if (!tableCard) return;
    const onScroll = () => {
      const rect = tableCard.getBoundingClientRect();
      // header is sticky at top:0; elevate when table has scrolled past its natural position
      header.classList.toggle('scrolled-header', rect.top < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [loading]);

  // ============================================
  // STRIVER TOGGLE — optimistic update, uniqueId as backend key
  // ============================================
  const handleToggleStriver = (number) => {
    requireAdmin(async () => {
      const problem = apiProblemsRef.current.find(p => String(p.number) === String(number));
      // Striver is LC-only
      if (!problem || problem.platform !== 'LC') return;
      const uid = problem?.uniqueId || problem?.id;
      if (!uid || striverId === uid) return;
      // Optimistic update — flip immediately, revert on error
      const prev = problem.isStriver;
      setApiProblems(ps => ps.map(p =>
        String(p.number) === String(number) ? { ...p, isStriver: !prev } : p
      ));
      try {
        setStriverId(uid);
        const res = await window.API.toggleStriver(uid);
        if (res.success) {
          // Confirm with server value
          setApiProblems(ps => ps.map(p =>
            String(p.number) === String(number) ? { ...p, isStriver: res.data.isStriver } : p
          ));
          window.API.getStriverStats().then(r => { if (r.success) setStriverStats(prev => ({ ...prev, ...r.data })); }).catch(() => {});
          showNotification(res.data.isStriver ? '📘 Added to Striver' : '✅ Removed from Striver', 'success');
        } else {
          // Revert
          setApiProblems(ps => ps.map(p =>
            String(p.number) === String(number) ? { ...p, isStriver: prev } : p
          ));
        }
      } catch (err) {
        setApiProblems(ps => ps.map(p =>
          String(p.number) === String(number) ? { ...p, isStriver: prev } : p
        ));
        showNotification(`❌ ${err.message}`, 'error');
      } finally {
        setStriverId(null);
      }
    });
  };

  // ============================================
  // TLE TOGGLE — optimistic update, uniqueId as backend key
  // ============================================
  const handleToggleTLE = (number) => {
    requireAdmin(async () => {
      const problem = apiProblemsRef.current.find(p => String(p.number) === String(number));
      // TLE is CF-only
      if (!problem || problem.platform !== 'CF') return;
      const uid = problem?.uniqueId || problem?.id;
      if (!uid || tleId === uid) return;
      const prev = problem.isTLE;
      setApiProblems(ps => ps.map(p =>
        String(p.number) === String(number) ? { ...p, isTLE: !prev } : p
      ));
      try {
        setTleId(uid);
        const res = await window.API.toggleTLE(uid);
        if (res.success) {
          setApiProblems(ps => ps.map(p =>
            String(p.number) === String(number) ? { ...p, isTLE: res.data.isTLE } : p
          ));
          window.API.getTLEStats().then(r => { if (r.success) setTleStats(prev => ({ ...prev, ...r.data })); }).catch(() => {});
          showNotification(res.data.isTLE ? '🏆 Added to TLE sheet' : '✅ Removed from TLE sheet', 'success');
        } else {
          setApiProblems(ps => ps.map(p =>
            String(p.number) === String(number) ? { ...p, isTLE: prev } : p
          ));
        }
      } catch (err) {
        setApiProblems(ps => ps.map(p =>
          String(p.number) === String(number) ? { ...p, isTLE: prev } : p
        ));
        showNotification(`❌ ${err.message}`, 'error');
      } finally {
        setTleId(null);
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

  // NOTE: Codeforces sync is unified into Sync All.

  const handleClearAllFilters = () => {
    const filterInputs = document.querySelectorAll('.filter-input, .filter-select');
    filterInputs.forEach(input => {
      input.classList.add('filter-reset-animation');
    });
    setTimeout(() => {
      filterInputs.forEach(input => {
        input.classList.remove('filter-reset-animation');
      });
    }, 400);

    setSearchTerm('');
    setDebouncedSearch('');
    setDifficultyFilter('All');
    setPatternFilter('All');
    setStatusFilter('All');
    setSelectedFilter(null);
    setPlatformFilter('ALL');
    setViewMode('ALL');

    showNotification('✨ All filters cleared', 'success');
  };

  // ESC key to clear all filters (including DifficultyNavbar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (searchTerm || debouncedSearch || difficultyFilter !== 'All' || patternFilter !== 'All' || statusFilter !== 'All' || selectedFilter !== null) {
          handleClearAllFilters();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, debouncedSearch, difficultyFilter, patternFilter, statusFilter, selectedFilter]);

  // ============================================
  // DYNAMIC ANALYTICS CALCULATIONS
  // ============================================

  // ── Striver + TLE stats — fetched from backend, locked shape (never undefined) ──
  const DEFAULT_STATS = { easy: 0, medium: 0, hard: 0, total: 0 };
  const [striverStats, setStriverStats] = useState(DEFAULT_STATS);
  const [tleStats, setTleStats] = useState({ ...DEFAULT_STATS, totalInSheet: 0 });

  const totalSolved   = allProblems.filter(p => p.status === 'Done').length;
  const totalProblems = allProblems.length;
  const lcSolved      = allProblems.filter(p => p.platform === 'LC' && p.status === 'Done').length;
  const cfSolved      = allProblems.filter(p => p.platform === 'CF' && p.status === 'Done').length;

  // Rolling 100 (kept for progress bar)
  const completedCycles = Math.floor(totalSolved / 100);
  const last100Progress = totalSolved % 100;
  const rollingProgressPercentage = last100Progress;

  // LeetCode Difficulty distribution — declared BEFORE useMemos that reference them
  const easyCount = allProblems.filter(p => p.difficulty === 'Easy' && p.status === 'Done').length;
  const mediumCount = allProblems.filter(p => p.difficulty === 'Medium' && p.status === 'Done').length;
  const hardCount = allProblems.filter(p => p.difficulty === 'Hard' && p.status === 'Done').length;

  const totalEasy = allProblems.filter(p => p.difficulty === 'Easy').length;
  const totalMedium = allProblems.filter(p => p.difficulty === 'Medium').length;
  const totalHard = allProblems.filter(p => p.difficulty === 'Hard').length;

  const easyPercent = totalEasy > 0 ? Math.round((easyCount / totalEasy) * 100) : 0;
  const mediumPercent = totalMedium > 0 ? Math.round((mediumCount / totalMedium) * 100) : 0;
  const hardPercent = totalHard > 0 ? Math.round((hardCount / totalHard) * 100) : 0;

  // ============================================
  // COACHING INTELLIGENCE — derived metrics
  // ============================================
  const coachingMetrics = React.useMemo(() => {
    // UTC today for all day-difference calculations — matches LeetCode day boundary
    const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z');
    const solved = allProblems.filter(p => p.status === 'Done');
    const revised = allProblems.filter(p => (p.revisionCount || 0) > 0);

    // revisionRate: how many solved problems have been revised at least once
    const revisionRate = solved.length > 0 ? revised.filter(p => p.status === 'Done').length / solved.length : 0;

    // avgGap: average days between solvedDate and lastRevisedAt (for revised problems)
    const gaps = revised
      .filter(p => p._solvedDateISO && p.lastRevisedAt)
      .map(p => {
        const s = parseLocalDate(p._solvedDateISO);
        const r = new Date(new Date(p.lastRevisedAt).toISOString().split('T')[0] + 'T00:00:00Z');
        return Math.max(0, Math.round((r - s) / 86400000));
      });
    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

    // forgottenCount: solved problems not revised in > 7 days (or never revised)
    const forgottenCount = solved.filter(p => {
      if ((p.revisionCount || 0) === 0) return true;
      if (!p.lastRevisedAt) return true;
      const r = new Date(new Date(p.lastRevisedAt).toISOString().split('T')[0] + 'T00:00:00Z');
      return Math.round((today - r) / 86400000) > 7;
    }).length;

    // topicDistribution: % of solved problems per topic
    const topicCounts = {};
    solved.forEach(p => {
      const t = p.pattern || 'Misc';
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
    const topicDist = Object.entries(topicCounts)
      .map(([t, c]) => ({ topic: t, count: c, pct: solved.length > 0 ? Math.round((c / solved.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    // lastSolvedByTopic: most recent solve date per topic
    const lastSolvedByTopic = {};
    solved.forEach(p => {
      const t = p.pattern || 'Misc';
      if (!lastSolvedByTopic[t] || (p._solvedDateISO && p._solvedDateISO > lastSolvedByTopic[t]))
        lastSolvedByTopic[t] = p._solvedDateISO;
    });

    // inactiveTopics: topics not solved in > 7 days
    const inactiveTopics = Object.entries(lastSolvedByTopic)
      .filter(([, d]) => {
        if (!d) return true;
        return Math.round((today - parseLocalDate(d)) / 86400000) > 7;
      })
      .map(([t]) => t);

    // difficultyTrend: last 20 solved problems difficulty
    const last20 = [...solved]
      .sort((a, b) => (b._solvedDateISO || '') > (a._solvedDateISO || '') ? 1 : -1)
      .slice(0, 20);
    const hardPct20 = last20.length > 0 ? last20.filter(p => p.difficulty === 'Hard').length / last20.length : 0;

    // weeklySolveFrequency
    const weekAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 7));
    const thisWeekCount = solved.filter(p => p._solvedDateISO && parseLocalDate(p._solvedDateISO) >= weekAgo).length;

    return {
      revisionRate, avgGap: parseFloat(avgGap.toFixed(1)), forgottenCount,
      topicDist, inactiveTopics, lastSolvedByTopic, hardPct20,
      thisWeekCount, revisedSolvedCount: revised.filter(p => p.status === 'Done').length,
    };
  }, [allProblems, solvedDates]);

  // ── Smart Coach Insights ──────────────────────────────────────────────────
  const smartCoachInsights = React.useMemo(() => {
    const insights = [];
    const { revisionRate, avgGap, forgottenCount, topicDist, inactiveTopics, hardPct20, thisWeekCount } = coachingMetrics;
    const totalD = easyCount + mediumCount + hardCount;

    // Critical
    if (forgottenCount > 40)
      insights.push({ sev: 'critical', icon: '🧠', msg: `${forgottenCount} problems forgotten`, action: 'Revise 5 today' });
    if (revisionRate < 0.3 && totalSolved > 10)
      insights.push({ sev: 'critical', icon: '⚠️', msg: 'Revising too slowly', action: `Only ${Math.round(revisionRate * 100)}% of solved problems revised` });

    // Warning
    if (avgGap > 5 && coachingMetrics.revisedSolvedCount > 0)
      insights.push({ sev: 'warning', icon: '📉', msg: `Large revision gap: avg ${avgGap}d`, action: 'Revise sooner after solving' });
    if (totalD > 0 && hardCount / totalD < 0.1)
      insights.push({ sev: 'warning', icon: '⚠️', msg: `Only ${Math.round((hardCount / totalD) * 100)}% Hard problems`, action: 'Attempt 1 Hard today' });
    if (topicDist.length > 0 && topicDist[0].pct > 40)
      insights.push({ sev: 'warning', icon: '⚖️', msg: `Over-focused on ${topicDist[0].topic} (${topicDist[0].pct}%)`, action: 'Diversify topics' });
    inactiveTopics.slice(0, 2).forEach(t =>
      insights.push({ sev: 'warning', icon: '🚫', msg: `${t} ignored 7+ days`, action: `Solve 2 ${t} today` })
    );

    // Positive
    if (revisionRate >= 0.5)
      insights.push({ sev: 'positive', icon: '🟢', msg: `Strong revision habit: ${Math.round(revisionRate * 100)}%`, action: 'Keep it up' });
    if (thisWeekCount >= 7)
      insights.push({ sev: 'positive', icon: '🔥', msg: `${thisWeekCount} problems this week`, action: 'Great pace' });

    return insights;
  }, [coachingMetrics, easyCount, mediumCount, hardCount, totalSolved]);

  // ── What To Do Today ─────────────────────────────────────────────────────
  const whatToDoToday = React.useMemo(() => {
    const { topicDist, inactiveTopics, forgottenCount } = coachingMetrics;
    const totalD = easyCount + mediumCount + hardCount;
    const items = [];

    // Solve targets
    const weakestTopic = topicDist.length > 0 ? topicDist[topicDist.length - 1]?.topic : null;
    const inactiveTopic = inactiveTopics[0] || null;
    if (weakestTopic) items.push({ icon: '💪', text: `Solve 2 Medium (${weakestTopic})`, type: 'solve' });
    if (inactiveTopic && inactiveTopic !== weakestTopic) items.push({ icon: '🚀', text: `Solve 2 from ${inactiveTopic}`, type: 'solve' });
    if (totalD > 0 && hardCount / totalD < 0.1) items.push({ icon: '🔥', text: 'Attempt 1 Hard problem', type: 'solve' });

    // Revise targets
    if (forgottenCount > 0) items.push({ icon: '🔁', text: `Revise ${Math.min(5, forgottenCount)} forgotten problems`, type: 'revise' });
    else if (coachingMetrics.revisedSolvedCount > 0) items.push({ icon: '🔁', text: 'Revise 3 recent problems', type: 'revise' });

    return items;
  }, [coachingMetrics, easyCount, mediumCount, hardCount]);

  // Streak display — always from dbStreak (computed from problem dates on backend)
  const displayCurrentStreak = dbStreak.currentStreak ?? 0;
  const displayMaxStreak = dbStreak.maxStreak ?? 0;
  const displayActiveDays = dbStreak.activeDays ?? 0;

  // Advanced Analytics
  const consistencyScore = React.useMemo(() => {
    const dates = Object.values(solvedDates).filter(d => d);

    const sortedDates = [...dates].sort();
    const firstDate = sortedDates.length > 0 ? parseLocalDate(sortedDates[0]) : new Date();
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const firstDateUTC = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), firstDate.getUTCDate()));
    const totalDaysTracked = Math.max(1, Math.ceil((today - firstDateUTC) / 86400000) + 1);

    const activeDays = new Set(dates).size;
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
  }, [totalSolved, solvedDates]);

  const weeklyPerformance = calculateWeeklyPerformance(allProblems, solvedDates);
  const dailyAverage = calculateDailyAverage(allProblems, solvedDates);
  const strongestDay = calculateStrongestDay(solvedDates);
  const targetSuggestion = React.useMemo(
    () => calculateTargetSuggestion(allProblems, solvedDates),
    [allProblems.length, solvedDates]
  );

  // LeetCode Difficulty distribution — declared above (before coaching useMemos)

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
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
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
  // Only shows problems where nextRevisionAt <= now (due for revision).
  // New solves get nextRevisionAt = solvedAt + 1 day, so they don't appear immediately.
  // Sub-sections: Due Now (overdue) | Upcoming (not yet due, shown for awareness)
  // ── Revision list — from backend (balanced 6 LC + 3 CF, sorted by urgency) ──
  const intelligentRevision = React.useMemo(() => {
    const now = new Date();
    return (revisionList || []).map(p => {
      // Match by uniqueId or by numeric problemIdNum for LC
      const local = allProblems.find(ap =>
        ap.uniqueId === (p.uniqueId || p.id) ||
        (ap.problemIdNum && p.problemIdNum && ap.problemIdNum === p.problemIdNum)
      ) || {};
      const solvedDateStr = p.solvedDate ? toLocalDateStr(new Date(p.solvedDate)) : null;
      const daysSinceSolved = solvedDateStr
        ? Math.max(1, Math.ceil((now - parseLocalDate(solvedDateStr)) / 86400000))
        : null;
      const conf = local.confidence ?? p.confidence ?? 3;
      const confidenceLevel = conf <= 1 ? 'LOW' : conf <= 3 ? 'MEDIUM' : 'HIGH';
      const neverRevised = (p.revisionCount || 0) === 0;
      return {
        ...p,
        ...local,
        nextRevisionAt: p.nextRevisionAt,
        revisionCount: p.revisionCount ?? local.revisionCount ?? 0,
        failureLoopFlagged: p.failureLoopFlagged ?? local.failureLoopFlagged ?? false,
        daysSinceSolved,
        neverRevised,
        confidenceLevel,
        number: local.number || p.problemIdNum || p.uniqueId || p.id,
        link: p.platformLink || p.leetcodeLink || local.link || '',
      };
    });
  }, [revisionList, allProblems, solvedDates]);

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
    return { list, totalCount: list.length };
  }, [allProblems]);



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

  // Reset viewMode when switching away from CF (TLE only applies to CF)
  useEffect(() => {
    if (platformFilter !== 'CF' && viewMode === 'TLE') setViewMode('ALL');
  }, [platformFilter, viewMode]);

  const filteredProblems = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return allProblems.filter(problem => {
      let matchesSearch;
      if (q === '') {
        matchesSearch = true;
      } else if (/^[0-9]+$/.test(q)) {
        // Numeric search: match LC problemIdNum exactly
        matchesSearch = problem.number === Number(q) || problem.problemIdNum === Number(q);
      } else {
        matchesSearch =
          (problem.title || '').toLowerCase().includes(q) ||
          (problem.difficulty || '').toLowerCase().includes(q) ||
          (problem.pattern || '').toLowerCase().includes(q) ||
          String(problem.number || '').toLowerCase().includes(q) ||
          (Array.isArray(problem.topics) ? problem.topics : []).some(t => t.toLowerCase().includes(q));
      }

      const dRating = problem.difficultyRating || (problem.difficulty === 'Easy' ? 1 : problem.difficulty === 'Medium' ? 3 : 5);
      const matchesDifficulty =
        difficultyFilter === 'All' || 
        (difficultyFilter === 'Easy' && dRating <= 2) ||
        (difficultyFilter === 'Medium' && dRating === 3) ||
        (difficultyFilter === 'Hard' && dRating >= 4);

      const matchesPattern =
        patternFilter === 'All' || problem.pattern === patternFilter;

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Targeted' ? problem.targeted === true :
          statusFilter === 'Striver' ? problem.isStriver === true :
          statusFilter === 'TLE' ? problem.isTLE === true :
            problem.status === statusFilter);

      // selectedFilter from DifficultyNavbar
      const matchesSelectedFilter =
        selectedFilter === null ||
        (selectedFilter === 'easy' ? dRating <= 2 && problem.status === 'Done' :
          selectedFilter === 'medium' ? dRating === 3 && problem.status === 'Done' :
            selectedFilter === 'hard' ? dRating >= 4 && problem.status === 'Done' :
              selectedFilter === 'solved' ? problem.status === 'Done' :
                false);

      // Platform filter
      const matchesPlatform =
        platformFilter === 'ALL' || problem.platform === platformFilter;

      return matchesSearch && matchesDifficulty && matchesPattern && matchesStatus && matchesSelectedFilter && matchesPlatform;
    });
  }, [allProblems, debouncedSearch, difficultyFilter, patternFilter, statusFilter, selectedFilter, platformFilter]);

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
        // Refresh suggestions too
        try {
          const sugRes = await window.API.getSuggestions();
          if (sugRes.success) setSuggestions(sugRes.data || []);
        } catch (_) { }
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
                <a href="https://leetcode.com/u/invisiblemanfromheart/" target="_blank" rel="noopener noreferrer" className="btn-profile">
                  <span>LeetCode Profile</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
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
              {[1, 2, 3, 4].map(i => (
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
                  {[1, 2, 3].map(i => (
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
                  {[1, 2, 3].map(i => (
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
              {[1, 2, 3, 4].map(i => (
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

        {/* Header — Mobile-First */}
        <header className="header">
          <div className="header-content">
            <div className="header-main">
              <div className="header-title">
                <h1>Priyanshu Gupta</h1>
                <p className="subtitle">Your Personal DSA Growth Engine</p>
              </div>
              <span className={`sync-status ${syncStatus}`}>
                {syncStatus === 'checking' ? '⏳ Checking' : syncStatus === 'ok' ? '🟢 Active' : '🔴 Expired'}
              </span>
            </div>
            <div className="header-actions">
              <button
                className="btn-sync-lc"
                onClick={handleSyncLeetCode}
                disabled={syncing}
                title="Sync LeetCode + Codeforces (problems + contest stats)"
              >
                {syncing ? (
                  <><span className="sync-spinner">⟳</span> Syncing...</>
                ) : (
                  <>🔄 Sync All</>
                )}
              </button>

              <a
                href="https://leetcode.com/u/invisiblemanfromheart/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-profile"
              >
                <span>LeetCode Profile</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                </svg>
              </a>

              <a
                href="https://codeforces.com/profile/priyanshuguptacoder"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-profile"
                style={{ marginLeft: '8px' }}
              >
                <span>CF Profile</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
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
            <StatCard value={totalSolved} label="Total Solved" icon="✅" delay={0.05} isReady={statsReady} />
            <div className="navbar-stat-divider" />
            <StatCard value={displayActiveDays} label="Active Days" icon="📅" delay={0.10} isReady={statsReady} />
            <div className="navbar-stat-divider" />
            <StatCard value={lcSolved} label="LeetCode" icon="💻" delay={0.15} isReady={statsReady} />
            <div className="navbar-stat-divider" />
            <StatCard value={cfSolved} label="Codeforces" icon="🏆" delay={0.20} isReady={statsReady} />
          </div>

          {/* Difficulty Navbar — filter by Easy/Medium/Hard */}
          <DifficultyNavbar
            easy={easyCount}
            medium={mediumCount}
            hard={hardCount}
            total={totalSolved}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
          />

          {/* Streak & Monthly Stats */}
          <div className="streak-monthly-grid fade-up fade-up-2">
            <div className="streak-card">
              <div className="streak-header">
                <h3 className="card-title">🔥 Streak Stats</h3>
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

              {/* Per-platform streak breakdown */}
              {(dbStreak.lc || dbStreak.cf) && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {[
                    { label: '💻 LC', streak: dbStreak.lc?.currentStreak ?? '—', days: dbStreak.lc?.activeDays ?? '—' },
                    { label: '🏆 CF', streak: dbStreak.cf?.currentStreak ?? '—', days: dbStreak.cf?.activeDays ?? '—' },
                  ].map(p => (
                    <div key={p.label} style={{
                      flex: 1, minWidth: 90,
                      background: 'var(--bg-tertiary)',
                      borderRadius: 8, padding: '8px 10px',
                      fontSize: '0.78rem', color: 'var(--text-secondary)',
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.label}</div>
                      <div>🔥 {p.streak}{typeof p.streak === 'number' ? 'd' : ''} streak</div>
                      <div>📅 {p.days} active days</div>
                    </div>
                  ))}
                </div>
              )}

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
                    const todayUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

                    for (let i = 6; i >= 0; i--) {
                      const date = new Date(todayUTC);
                      date.setUTCDate(date.getUTCDate() - i);
                      const dateStr = toLocalDateStr(date);
                      const dayName = date.toLocaleString('en-US', { timeZone: 'UTC', weekday: 'short' });

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

              {/* ── Progress Overview ── */}
              <div className="mp-section">
                <div className="mp-month-row">
                  <span className="mp-month-name">{new Date().toLocaleString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' })}</span>
                  {(() => {
                    const pace = targetSuggestion.hasData
                      ? parseFloat(targetSuggestion.avgLast30) >= parseFloat(targetSuggestion.dailyRequired)
                      : null;
                    if (pace === null) return null;
                    return (
                      <span className={`mp-track-badge ${pace ? 'on-track' : 'behind'}`}>
                        {pace ? '🟢 On track' : '🔴 Behind'}
                      </span>
                    );
                  })()}
                </div>
                {targetSuggestion.hasData ? (
                  <>
                    <div className="mp-progress-bar-track">
                      <div className="mp-progress-bar-fill" style={{ width: `${Math.min(100, Math.round((currentMonthStats.count / targetSuggestion.moderateMonthlyTarget) * 100))}%` }} />
                      {/* Expected progress marker */}
                      {(() => {
                        const daysInMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0)).getUTCDate();
                        const dayOfMonth = new Date().getUTCDate();
                        const expectedPct = Math.round((dayOfMonth / daysInMonth) * 100);
                        return <div className="mp-expected-marker" style={{ left: `${expectedPct}%` }} title={`Expected: ${expectedPct}%`} />;
                      })()}
                    </div>
                    <div className="mp-progress-label">
                      <span><strong style={{ color: 'var(--primary)' }}>{currentMonthStats.count}</strong> solved · {targetSuggestion.moderateMonthlyTarget - currentMonthStats.count} remaining</span>
                      <span style={{ color: 'var(--text-muted)' }}>{Math.min(100, Math.round((currentMonthStats.count / targetSuggestion.moderateMonthlyTarget) * 100))}%</span>
                    </div>
                    <div className="mp-stats-row">
                      <div className="mp-stat">
                        <span className="mp-stat-val">{targetSuggestion.avgLast30}</span>
                        <span className="mp-stat-lbl">your pace/day</span>
                      </div>
                      <div className="mp-stat-divider" />
                      <div className="mp-stat">
                        <span className="mp-stat-val" style={{ color: parseFloat(targetSuggestion.dailyRequired) > parseFloat(targetSuggestion.avgLast30) ? 'var(--warning, #f59e0b)' : 'var(--success)' }}>
                          {targetSuggestion.dailyRequired}
                        </span>
                        <span className="mp-stat-lbl">required/day</span>
                      </div>
                      <div className="mp-stat-divider" />
                      <div className="mp-stat">
                        <span className="mp-stat-val">{targetSuggestion.remainingDays}</span>
                        <span className="mp-stat-lbl">days left</span>
                      </div>
                    </div>
                    {parseFloat(targetSuggestion.dailyRequired) > parseFloat(targetSuggestion.avgLast30) && (
                      <div className="mp-pace-gap">
                        +{(parseFloat(targetSuggestion.dailyRequired) - parseFloat(targetSuggestion.avgLast30)).toFixed(1)} more/day needed
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                    <strong style={{ color: 'var(--primary)' }}>{currentMonthStats.count}</strong> solved · Need 7+ days of data for targets
                  </div>
                )}
              </div>

              {/* ── Today's Plan ── */}
              {targetSuggestion.hasData && (() => {
                const solveTarget = Math.max(1, Math.ceil(parseFloat(targetSuggestion.dailyRequired)));
                const reviseTarget = Math.min(3, coachingMetrics.forgottenCount > 0 ? 5 : 3);
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
                      <div className="mp-today-focus">Focus: {focusTopics.join(' · ')}</div>
                    )}
                  </div>
                );
              })()}

              {/* ── Action Insights (severity system) ── */}
              {smartCoachInsights.length > 0 && (
                <div className="mp-section mp-insights">
                  <div className="mp-insights-title">Insights</div>
                  {smartCoachInsights.map((ins, i) => (
                    <div key={i} className={`mp-insight-row mp-insight-${ins.sev === 'critical' ? 'urgent' : ins.sev === 'warning' ? 'improve' : 'positive'}`}>
                      <span>{ins.icon} {ins.msg}</span>
                      <span className="mp-insight-action">→ {ins.action}</span>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Contest Stats — placed below streak/monthly analytics */}
          </div>

          {/* Contest Stats — directly below streak + monthly planner */}
          <ContestStats stats={contestStats} />

          {/* Striver Progress — always visible */}
          <div className="analytics-card striver-card fade-up fade-up-4">
            <h3 className="card-title">📘 Striver Progress</h3>
            <ProgressCard data={striverStats} />
            {striverStats.total === 0 && (
              <div className="striver-empty">Click 📘 on any LC problem to mark it as Striver</div>
            )}
          </div>

          {/* TLE Sheet Progress — always visible */}
          <div className="analytics-card striver-card fade-up fade-up-4">
            <h3 className="card-title">🏆 TLE Sheet Progress</h3>
            <ProgressCard data={tleStats} />
            {(tleStats.totalInSheet ?? 0) === 0 && (
              <div className="striver-empty">No CF problems match the TLE Sheet criteria yet.</div>
            )}
          </div>

          {/* Needs Revision — Spaced Repetition Queue */}
          {(() => {
            const now = new Date();
            const dueNow = intelligentRevision; // already filtered to nextRevisionAt <= now
            const failureLoop = intelligentRevision.filter(p => p.failureLoopFlagged);
            const pendingCount = dueNow.length;
            const limitReached = dailyRevisionCount >= DAILY_REVISION_LIMIT;

            const RevSubSection = ({ title, items }) => {
              if (items.length === 0) return null;
              return (
                <div className="sug-section">
                  <div className="sug-section-title">{title}</div>
                  <div className={getPcGridClass(items.length)}>
                    {items.map(p => (
                      <div key={p.number} style={{ position: 'relative' }}>
                        {p.failureLoopFlagged && (
                          <div style={{
                            position: 'absolute', top: 6, right: 6, zIndex: 2,
                            background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444',
                            borderRadius: 6, padding: '2px 7px', fontSize: '0.7rem',
                            color: '#ef4444', fontWeight: 700,
                          }}>⚠️ Pattern not learned</div>
                        )}
                        <ProblemCard
                          p={p}
                          variant="revision"
                          onRevise={handleRevise}
                          revisingId={revisingId}
                          formatDate={formatDate}
                          onUserDiffChange={handleUserDifficultyChange}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <div className="suggestions-card fade-up">
                <div className="sug-header">
                  <h3 className="card-title">🔁 Needs Revision ({pendingCount})</h3>
                  <span className="sug-subtitle">
                    {dailyRevisionCount}/{DAILY_REVISION_LIMIT} revised today
                    {limitReached ? ' · Daily limit reached' : ''}
                  </span>
                </div>

                {limitReached && (
                  <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem',
                    fontSize: '0.82rem', color: '#ef4444',
                  }}>
                    🚫 Daily revision limit reached (5/5). Come back tomorrow.
                  </div>
                )}

                {failureLoop.length > 0 && (
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem',
                    fontSize: '0.82rem', color: 'var(--text-secondary)',
                  }}>
                    ⚠️ <strong style={{ color: '#ef4444' }}>{failureLoop.length} problem{failureLoop.length > 1 ? 's' : ''}</strong> stuck in failure loop — study the pattern, then retry after 24h.
                  </div>
                )}

                {pendingCount === 0 ? (
                  <div className="pc-empty">
                    <div className="pc-empty-icon">🎉</div>
                    <div>No revisions due right now</div>
                    <small>Problems appear here when their scheduled revision date arrives</small>
                  </div>
                ) : (
                  <RevSubSection title="📅 Due Now" items={dueNow} />
                )}
              </div>
            );
          })()}

          {/* Today's Progress + Recently Solved */}
          {(() => {
            const relativeTime = (date) => {
              if (!date) return '';
              const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
              if (diff < 60) return `${diff}s ago`;
              if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
              if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
              return `${Math.floor(diff / 86400)}d ago`;
            };

            // Merge backend data with full problem data from allProblems for extra fields
            const enrichProblem = (p) => {
              if (!p) return null;
              const probId = String(p.uniqueId || p.id || p.number || '');
              const isCF =
                p.platform === 'CF' ||
                probId.startsWith('CF-') ||
                /^[0-9]+[A-Za-z]+$/.test(probId);
              // Match by uniqueId first, then by numeric problemIdNum for LC
              const full = allProblems.find(ap =>
                ap.uniqueId === probId ||
                ap.uniqueId === (p.uniqueId || p.id) ||
                (ap.problemIdNum && p.problemIdNum && ap.problemIdNum === p.problemIdNum)
              ) || {};
              const defaultLink = isCF
                ? `https://codeforces.com/problemset/problem/${p.contestId || full.contestId}/${p.index || full.index}`
                : `https://leetcode.com/problems/${p.problemIdNum || probId}/`;
              return {
                ...p,
                number: full.number || p.problemIdNum || probId,
                platform: p.platform || full.platform || (isCF ? 'CF' : 'LC'),
                isStriver: full.isStriver ?? p.isStriver ?? false,
                targeted: full.targeted ?? p.targeted ?? false,
                revisionCount: full.revisionCount ?? p.revisionCount ?? 0,
                lastRevisedAt: full.lastRevisedAt ?? p.lastRevisedAt ?? null,
                link: p.platformLink || p.leetcodeLink || full.link || defaultLink,
                providerTitle: p?.providerTitle || full?.providerTitle || (isCF ? 'Codeforces' : 'LeetCode'),
              };
            };

            const enrichedRecent = (recentProblems || []).map(enrichProblem).filter(Boolean);
            const enrichedToday = (todayProblems || []).map(enrichProblem).filter(Boolean);

            // Status badge for recently solved cards
            const solveStatus = (lastSubmittedAt) => {
              if (!lastSubmittedAt) return null;
              const hrs = (Date.now() - new Date(lastSubmittedAt).getTime()) / 3600000;
              if (hrs < 24) return { label: 'Fresh', cls: 'rs-status-fresh' };
              if (hrs > 72) return { label: 'Needs Revision', cls: 'rs-status-stale' };
              return null;
            };

            // Card click handler with navigation
            const handleCardClick = (problemNumber) => {
              handleClickSuggestion(problemNumber);
            };

            // Button click with propagation stop
            const handleButtonClick = (e, action, problemNumber) => {
              e.stopPropagation();
              if (action === 'revise') {
                handleRevise(problemNumber);
              } else if (action === 'striver') {
                handleToggleStriver(problemNumber);
              } else if (action === 'target') {
                handleToggleTarget(problemNumber);
              }
            };

            return (
              <>
                {/* ── Today's Progress ── */}
                <div className="suggestions-card fade-up" style={{ marginBottom: 16 }}>
                  <div className="sug-header">
                    <div>
                      <h3 className="card-title" style={{ marginBottom: 2 }}>
                        ☀️ Today's Progress
                        <span style={{ marginLeft: 10, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {enrichedToday.length} solved
                        </span>
                      </h3>
                      <span className="sug-subtitle">Problems you solved today</span>
                    </div>
                  </div>

                  {enrichedToday.length === 0 ? (
                    <div className="pc-empty">
                      <div className="pc-empty-icon">🌅</div>
                      <div>No problems solved today</div>
                      <small>Start solving to build your streak</small>
                    </div>
                  ) : (
                    <div className="tp-list">
                      {enrichedToday.map((p, idx) => {
                        const diff = (p.difficulty || 'medium').toLowerCase();
                        const isRevisited = (p.revisionCount || 0) > 0;
                        return (
                          <React.Fragment key={p._id || p.number}>
                            {idx > 0 && <div className="tp-divider" />}
                            <div className="tp-item">
                              <div className="tp-item-left">
                                <span className={`badge badge-${diff}`}>{p.difficulty}</span>
                                <div className="tp-problem-info">
                                  <div className="tp-title">#{p.number} {p.title}</div>
                                  <div className="tp-meta">
                                    {isRevisited
                                      ? <span className="tp-badge tp-badge-revisited">Revisited</span>
                                      : <span className="tp-badge tp-badge-new">New</span>
                                    }
                                    <span className="recent-time">{relativeTime(p.lastSubmittedAt)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="tp-item-right">
                                <a
                                  className="pc-btn pc-btn-open"
                                  href={p.link || p.leetcodeLink || `https://leetcode.com/problems/${p.number}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open ↗
                                </a>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Recently Solved ── */}
                <div className="suggestions-card fade-up" style={{ marginBottom: 16 }}>
                  <div className="sug-header">
                    <h3 className="card-title" style={{ marginBottom: 2 }}>🆕 Recently Solved</h3>
                    <span className="sug-subtitle">Click any card to find in table</span>
                  </div>

                  {enrichedRecent.length === 0 ? (
                    <div className="pc-empty">
                      <div className="pc-empty-icon">📭</div>
                      <div>No recent problems found</div>
                      <small>Sync LeetCode to populate</small>
                    </div>
                  ) : (
                    <div className={getPcGridClass(enrichedRecent.length)}>
                      {enrichedRecent.map(p => {
                        const diff = (p.difficulty || 'medium').toLowerCase();
                        const status = solveStatus(p.lastSubmittedAt);
                        return (
                          <div
                            key={p._id || p.number}
                            className="pc-card pc-card-clickable"
                            onClick={() => handleCardClick(p.number)}
                          >
                            {/* Top row */}
                            <div className="pc-top-row">
                              <span className="pc-id">#{p.number}</span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {status && <span className={`rs-status ${status.cls}`}>{status.label}</span>}
                                <span className="recent-time">{relativeTime(p.lastSubmittedAt)}</span>
                              </div>
                            </div>

                            {/* Title */}
                            <div className="pc-title">{p.title}</div>

                            {/* Meta */}
                            <div className="pc-meta">
                              <span className={`badge badge-${diff}`}>{p.difficulty}</span>
                              {(p.revisionCount || 0) > 0 && (
                                <span className="pc-rev-badge">🔁 {p.revisionCount}×</span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="pc-actions">
                              <a
                                className="pc-btn pc-btn-open"
                                href={p.link || p.leetcodeLink || `https://leetcode.com/problems/${p.number}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open ↗
                              </a>
                              <button
                                className={`pc-btn-toggle ${p.isStriver ? 'active' : ''}`}
                                onClick={(e) => handleButtonClick(e, 'striver', p.number)}
                                disabled={striverId === p.number}
                                title={p.isStriver ? 'Striver Active' : 'Add to Striver'}
                              >
                                <span className="toggle-icon">📘</span>
                              </button>
                              <button
                                className={`pc-btn-toggle ${p.targeted ? 'active' : ''}`}
                                onClick={(e) => handleButtonClick(e, 'target', p.number)}
                                disabled={targetingId === p.number}
                                title={p.targeted ? 'Target Active' : 'Add to Targeted'}
                              >
                                <span className="toggle-icon">🎯</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* Targeted Problems — manually marked by user */}
          {(() => {
            const list = targetedProblems.list;
            return (
              <div className="pc-section fade-up">
                <h3 className="card-title">🎯 Targeted Problems ({list.length})</h3>
                {list.length > 0 ? (
                  <div className={getPcGridClass(list.length)}>
                    {list.map(p => (
                      <ProblemCard
                        key={p.number}
                        p={p}
                        variant="targeted"
                        onRevise={handleRevise}
                        revisingId={revisingId}
                        formatDate={formatDate}
                        onUserDiffChange={handleUserDifficultyChange}
                        onTarget={handleToggleTarget}
                        targetingId={targetingId}
                        onClickCard={handleClickSuggestion}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="pc-empty pc-empty-cta">
                    <div className="pc-empty-icon">🎯</div>
                    <div>No targeted problems yet</div>
                    <small>Click the 🎯 button on any problem in the table to add it here</small>
                    <button
                      className="btn-cta"
                      onClick={() => {
                        const tableSection = document.querySelector('.table-card');
                        if (tableSection) {
                          tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      Browse Problems
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Rolling Focus — Intelligent */}
          <div className="progress-card">
            <div className="progress-header">
              <div>
                <h2>Rolling Focus</h2>
                <p className="progress-subtitle">
                  {totalSolved} solved · {totalProblems - totalSolved} remaining
                  {completedCycles > 0 && ` · ${completedCycles} cycle${completedCycles > 1 ? 's' : ''} done`}
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
                <div className="progress-bar-fill" style={{ width: `${rollingProgressPercentage}%` }}>
                  <span className="progress-bar-text">{rollingProgressPercentage}%</span>
                </div>
              </div>
            </div>
            {/* Coaching insight badges */}
            <div className="rolling-insight-badges">
              <span className={`rib ${coachingMetrics.revisionRate < 0.3 ? 'rib-red' : coachingMetrics.revisionRate < 0.5 ? 'rib-yellow' : 'rib-green'}`}>
                🔁 {Math.round(coachingMetrics.revisionRate * 100)}% revised
              </span>
              <span className={`rib ${coachingMetrics.avgGap > 5 ? 'rib-yellow' : 'rib-green'}`}>
                ⏱ {coachingMetrics.avgGap}d avg gap
              </span>
              <span className={`rib ${coachingMetrics.forgottenCount > 40 ? 'rib-red' : coachingMetrics.forgottenCount > 20 ? 'rib-yellow' : 'rib-green'}`}>
                🧠 {coachingMetrics.forgottenCount} forgotten
              </span>
              {coachingMetrics.topicDist[0] && (
                <span className={`rib ${coachingMetrics.topicDist[0].pct > 40 ? 'rib-yellow' : 'rib-green'}`}>
                  📊 {coachingMetrics.topicDist[0].topic} {coachingMetrics.topicDist[0].pct}%
                </span>
              )}
            </div>
            <div className="rolling-stats">
              <div className="rolling-stat-item">
                <span className="rolling-stat-label">Total:</span>
                <span className="rolling-stat-value">{totalProblems}</span>
              </div>
              <div className="rolling-stat-divider"></div>
              <div className="rolling-stat-item">
                <span className="rolling-stat-label">Solved:</span>
                <span className="rolling-stat-value solved">{totalSolved}</span>
              </div>
              <div className="rolling-stat-divider"></div>
              <div className="rolling-stat-item">
                <span className="rolling-stat-label">Revised:</span>
                <span className="rolling-stat-value">{coachingMetrics.revisedSolvedCount}</span>
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

          {/* Platform Filter Tabs */}
          <div className="platform-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[
              { key: 'ALL', label: '🌐 All',         count: allProblems.length },
              { key: 'LC',  label: '💻 LeetCode',    count: allProblems.filter(p => p.platform === 'LC').length },
              { key: 'CF',  label: '🏆 Codeforces',  count: allProblems.filter(p => p.platform === 'CF').length },
            ].map(tab => (
              <button
                key={tab.key}
                className={`platform-tab-btn${platformFilter === tab.key ? ' active' : ''}`}
                onClick={() => setPlatformFilter(tab.key)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: platformFilter === tab.key ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                  background: platformFilter === tab.key ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)',
                  color: platformFilter === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: platformFilter === tab.key ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {tab.label}
                <span style={{
                  background: platformFilter === tab.key ? 'var(--primary)' : 'var(--bg-secondary)',
                  color: platformFilter === tab.key ? '#fff' : 'var(--text-secondary)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>{tab.count}</span>
              </button>
            ))}
          </div>

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
                  className={`filter-select${difficultyFilter !== 'All' ? ' filter-active' : ''}`}
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
                  className={`filter-select${patternFilter !== 'All' ? ' filter-active' : ''}`}
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
                  className={`filter-select${statusFilter !== 'All' ? ' filter-active' : ''}`}
                >
                  <option>All</option>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Done</option>
                  <option>Targeted</option>
                  <option>Striver</option>
                  <option>TLE</option>
                </select>
              </div>
              {(searchTerm || difficultyFilter !== 'All' || patternFilter !== 'All' || statusFilter !== 'All' || selectedFilter !== null || platformFilter !== 'ALL') && (
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
            <div className="table-header" ref={tableHeaderRef}>
              <h3>Problem List</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedFilter && (
                  <span className={`diff-active-badge diff-active-${selectedFilter}`}>
                    {selectedFilter === 'solved' ? 'All Solved' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} only
                    <button className="diff-active-clear" onClick={() => setSelectedFilter(null)}>✕</button>
                  </span>
                )}
                <span className="table-count">{filteredProblems.length} problems</span>
              </div>
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
                    filteredProblems.map((problem, index) => (
                      <tr key={problem._id || problem.id} data-problem-number={problem.number}
                        className={selectedProblemId === problem.number ? 'highlight-row' : ''}
                      >
                        <td className="problem-number">{index + 1}</td>
                        <td className="problem-title">
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span className="problem-id-badge" style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.55, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                              {getDisplayId(problem)}
                            </span>
                            <span>{problem.title}</span>
                          </div>
                        </td>
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
                                disabled={(problem.revisionCount || 0) === 0 || unrevisingId === String(problem.number)}
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
                            href={problem.link || (problem.platform === 'CF' ? `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}` : `https://leetcode.com/problems/${problem.number}/`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="problem-link-btn"
                            title={`Open on ${problem.platform === 'CF' ? 'Codeforces' : 'LeetCode'}`}
                          >
                            {problem.platform === 'CF' ? '🏆' : '🔗'} Open
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
                              disabled={targetingId === (problem.uniqueId || problem.id)}
                              title={problem.targeted ? 'Remove from Targeted' : 'Add to Targeted'}
                            >
                              {targetingId === (problem.uniqueId || problem.id) ? '⏳' : '🎯'}
                            </button>
                            {(problem.platform === 'LC') && (
                              <button
                                className={`btn-striver${problem.isStriver ? ' active' : ''}`}
                                onClick={() => handleToggleStriver(problem.number)}
                                disabled={striverId === (problem.uniqueId || problem.id)}
                                title={problem.isStriver ? 'Remove from Striver' : 'Mark as Striver'}
                              >
                                {striverId === (problem.uniqueId || problem.id) ? '⏳' : '📘'}
                              </button>
                            )}
                            {(problem.platform === 'CF') && (
                              <button
                                className={`btn-tle${problem.isTLE ? ' active' : ''}`}
                                onClick={() => handleToggleTLE(problem.number)}
                                disabled={tleId === (problem.uniqueId || problem.id)}
                                title={problem.isTLE ? 'Remove from TLE sheet' : 'Add to TLE sheet'}
                              >
                                {tleId === (problem.uniqueId || problem.id) ? '⏳' : '🏆'}
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
                  <div key={problem._id || problem.id} className="pm-card" data-problem-number={problem.number}>
                    {/* Row 1: badges */}
                    <div className="pm-top">
                      <span className={`badge badge-${(problem.difficulty || 'medium').toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                      {problem.status === 'Done' && problem._solvedDateISO && (
                        <span className="pm-date">📅 {formatDate(problem._solvedDateISO)}</span>
                      )}
                      {problem.targeted && <span className="pm-tag pm-tag-target">🎯</span>}
                      {problem.isStriver && <span className="pm-tag pm-tag-striver">📘</span>}
                    </div>

                    {/* Row 2: title with ID badge */}
                    <div className="pm-title">
                      <span className="problem-id-badge" style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.5, marginRight: '5px', fontVariantNumeric: 'tabular-nums' }}>
                        {getDisplayId(problem)}
                      </span>
                      {problem.title}
                    </div>

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
                          disabled={(problem.revisionCount || 0) === 0 || unrevisingId === String(problem.number)}
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
                        disabled={targetingId === (problem.uniqueId || problem.id)}
                        title={problem.targeted ? 'Remove from Targeted' : 'Add to Targeted'}
                      >
                        {targetingId === (problem.uniqueId || problem.id) ? '⏳' : '🎯'}
                      </button>
                      {(problem.platform === 'LC') && (
                        <button
                          className={`btn-striver${problem.isStriver ? ' active' : ''}`}
                          onClick={() => handleToggleStriver(problem.number)}
                          disabled={striverId === (problem.uniqueId || problem.id)}
                          title={problem.isStriver ? 'Remove from Striver' : 'Mark as Striver'}
                        >
                          {striverId === (problem.uniqueId || problem.id) ? '⏳' : '📘'}
                        </button>
                      )}
                      {(problem.platform === 'CF') && (
                        <button
                          className={`btn-tle${problem.isTLE ? ' active' : ''}`}
                          onClick={() => handleToggleTLE(problem.number)}
                          disabled={tleId === (problem.uniqueId || problem.id)}
                          title={problem.isTLE ? 'Remove from TLE sheet' : 'Add to TLE sheet'}
                        >
                          {tleId === (problem.uniqueId || problem.id) ? '⏳' : '🏆'}
                        </button>
                      )}
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
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="e.g., 1"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Type *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                        placeholder="Auto-detected from title"
                        className="form-input"
                      />
                    </div>
                  </div>
                  <div className="form-hint">
                    💡 Pattern will be automatically detected from the title if not provided
                  </div>
                  {formData.type === 'Solved' && (
                    <>
                      <div className="form-row" style={{ marginTop: '0.5rem' }}>
                        <div className="form-group">
                          <label>Solve Time (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.solveTime}
                            onChange={(e) => setFormData({ ...formData, solveTime: e.target.value })}
                            placeholder="e.g., 30"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Wrong Attempts</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.wrongAttempts}
                            onChange={(e) => setFormData({ ...formData, wrongAttempts: e.target.value })}
                            placeholder="e.g., 2"
                            className="form-input"
                          />
                        </div>
                      </div>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '0.4rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.hintsUsed}
                          onChange={(e) => setFormData({ ...formData, hintsUsed: e.target.checked })}
                        />
                        Used a hint / looked at solution
                      </label>
                      {((formData.solveTime && parseFloat(formData.solveTime) > 25) || formData.hintsUsed || (formData.wrongAttempts && parseInt(formData.wrongAttempts) >= 2)) && (
                        <div style={{
                          marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 7,
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          fontSize: '0.78rem', color: '#ef4444'
                        }}>
                          ⚠️ Auto-flagged for Needs Revision — you'll be asked for the root cause.
                        </div>
                      )}
                    </>
                  )}
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

        {/* Mistake Type Modal — mandatory after auto-flagging */}
        {mistakeModal && (
          <MistakeTypeModal
            problemTitle={`#${mistakeModal.number} ${mistakeModal.title}`}
            onConfirm={handleMistakeTypeConfirm}
            onClose={() => setMistakeModal(null)}
          />
        )}

        {/* Revision Mode Modal — 15-min timer */}
        {revisionModal && (
          <RevisionModeModal
            problem={revisionModal}
            onComplete={handleRevisionComplete}
            onClose={() => setRevisionModal(null)}
          />
        )}

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

// Sync sticky offset CSS vars — desktop only.
// On mobile, zero out the vars so sticky th top offsets don't affect layout.
function syncStickyOffsets() {
  if (window.innerWidth <= 768) {
    document.documentElement.style.setProperty('--app-header-height', '0px');
    document.documentElement.style.setProperty('--table-header-height', '0px');
    return;
  }
  const appHeader = document.querySelector('.header');
  const tableHeader = document.querySelector('.table-header');
  if (appHeader) {
    document.documentElement.style.setProperty('--app-header-height', appHeader.offsetHeight + 'px');
  }
  if (tableHeader) {
    document.documentElement.style.setProperty('--table-header-height', tableHeader.offsetHeight + 'px');
  }
}
document.addEventListener('DOMContentLoaded', syncStickyOffsets);
window.addEventListener('resize', syncStickyOffsets);
syncStickyOffsets();