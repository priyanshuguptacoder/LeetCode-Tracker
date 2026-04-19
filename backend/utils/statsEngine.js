// ─── statsEngine.js — SINGLE SOURCE OF TRUTH for all streak/activity stats ───
//
// DATE BOUNDARIES (strict, per platform):
//   LC      → UTC midnight  (matches LeetCode's own day boundary)
//   CF      → IST midnight  (Asia/Kolkata, UTC+5:30 — matches CF user experience)
//   GLOBAL  → UTC midnight  (same as LC; calendar dates are UTC)
//
// This means a CF solve at 11:30 PM IST correctly counts as "today" for CF streak,
// even though it's 6:00 PM UTC (same UTC day anyway in this case).
// A CF solve at 12:30 AM IST = 7:00 PM UTC previous day → counts as IST "today",
// but as UTC "yesterday" for global — this is EXPECTED and correct.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

// ─── UTC day key ──────────────────────────────────────────────────────────────
function getUTCDayKey(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// ─── IST day key ──────────────────────────────────────────────────────────────
function getISTDayKey(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const y   = ist.getUTCFullYear();
  const m   = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Platform-aware day key ───────────────────────────────────────────────────
// CF → IST, everything else → UTC
function getDayKey(date, platform) {
  return platform === 'CF' ? getISTDayKey(date) : getUTCDayKey(date);
}

// ─── Next day (works on any YYYY-MM-DD string) ────────────────────────────────
function getNextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const y   = d.getUTCFullYear();
  const m   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Gap detection ────────────────────────────────────────────────────────────
function detectGaps(sortedDays) {
  const gaps = [];
  for (let i = 0; i < sortedDays.length - 1; i++) {
    let expected = getNextDay(sortedDays[i]);
    while (expected < sortedDays[i + 1]) {
      gaps.push(expected);
      expected = getNextDay(expected);
    }
  }
  return gaps;
}

// ─── isNextDay ────────────────────────────────────────────────────────────────
function isNextDay(prev, curr) {
  const d1 = new Date(prev + 'T00:00:00Z');
  const d2 = new Date(curr + 'T00:00:00Z');
  return (d2 - d1) / 86400000 === 1;
}

// ─── computeStreak — pure streak from a sorted unique-day array ───────────────
function computeStreak(sortedDays, todayKey) {
  if (!sortedDays.length) return { currentStreak: 0, maxStreak: 0 };

  // Max streak
  let maxStreak = 1, temp = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    if (isNextDay(sortedDays[i - 1], sortedDays[i])) {
      temp++;
      maxStreak = Math.max(maxStreak, temp);
    } else {
      temp = 1;
    }
  }
  maxStreak = Math.max(maxStreak, 1);

  // Current streak — alive if solved today OR yesterday
  const yesterdayKey = getNextDay(
    // yesterday = today minus 1 day
    (() => {
      const d = new Date(todayKey + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    })()
  );
  // Actually just subtract 1 day from todayKey
  const prevDay = (() => {
    const d = new Date(todayKey + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  })();

  const daySet = new Set(sortedDays);
  const startCursor = daySet.has(todayKey) ? todayKey
    : daySet.has(prevDay) ? prevDay
    : null;

  if (!startCursor) return { currentStreak: 0, maxStreak };

  const idx = sortedDays.lastIndexOf(startCursor);
  let currentStreak = 1;
  for (let i = idx - 1; i >= 0; i--) {
    if (isNextDay(sortedDays[i], sortedDays[i + 1])) currentStreak++;
    else break;
  }

  return { currentStreak, maxStreak };
}

// ─── computeStats — main entry point ─────────────────────────────────────────
// Input:
//   problems      — array of { solvedDate, lastSubmittedAt, platform }
//   calendarDates — optional YYYY-MM-DD UTC strings (LeetCode submission calendar)
//   platformHint  — 'LC' | 'CF' | 'ALL' — controls which day key to use
//
// Output: { currentStreak, maxStreak, activeDays, daysTracked, consistency,
//           startDate, todayKey, days, gaps, isValid, errors }
function computeStats(problems, calendarDates = null, platformHint = 'ALL') {
  // Today key depends on platform
  const todayKey = platformHint === 'CF' ? getISTDayKey(new Date()) : getUTCDayKey(new Date());

  const daySet = new Set();

  // Merge LeetCode submission calendar (UTC dates — only for LC/ALL)
  if ((platformHint === 'ALL' || platformHint === 'LC') &&
      Array.isArray(calendarDates) && calendarDates.length > 0) {
    for (const k of calendarDates) {
      if (k && k <= todayKey) daySet.add(k); // calendar is already UTC
    }
    console.log(`[STATS ENGINE] calendar merged: ${calendarDates.length} UTC dates`);
  }

  // Merge problem dates using platform-aware day key
  let skipped = 0;
  for (const p of problems) {
    const raw = p.solvedDate || p.lastSubmittedAt;
    if (!raw) { skipped++; continue; }
    // Use the problem's own platform if available, else fall back to platformHint
    const plat = p.platform || (platformHint !== 'ALL' ? platformHint : 'LC');
    const key  = getDayKey(new Date(raw), plat);
    if (!key) { skipped++; continue; }
    if (key <= todayKey) daySet.add(key);
  }

  if (skipped > 0) console.warn(`[STATS ENGINE] skipped ${skipped} problems with no valid date`);

  const days       = [...daySet].sort();
  const activeDays = daySet.size;

  console.log(`[STATS ENGINE] platform=${platformHint} today=${todayKey} activeDays=${activeDays} last5=[${days.slice(-5).join(',')}]`);

  if (activeDays === 0) {
    return {
      currentStreak: 0, maxStreak: 0, activeDays: 0,
      daysTracked: 0, consistency: 0,
      startDate: null, todayKey, days: [], gaps: [],
      isValid: true, errors: [],
    };
  }

  const startDate   = days[0];
  const daysTracked = Math.round(
    (new Date(todayKey + 'T00:00:00Z') - new Date(startDate + 'T00:00:00Z')) / 86400000
  ) + 1;

  const gaps = detectGaps(days);
  const { currentStreak, maxStreak } = computeStreak(days, todayKey);
  const consistency = daysTracked > 0 ? Math.round((activeDays / daysTracked) * 100) : 0;

  console.log(`[STATS ENGINE] current=${currentStreak} max=${maxStreak} active=${activeDays} tracked=${daysTracked} consistency=${consistency}%`);

  const errors = [];
  if (activeDays !== days.length) errors.push(`activeDays mismatch: ${activeDays} vs ${days.length}`);
  if (maxStreak > activeDays)     errors.push(`maxStreak (${maxStreak}) > activeDays (${activeDays})`);
  if (currentStreak > maxStreak)  errors.push(`currentStreak (${currentStreak}) > maxStreak (${maxStreak})`);
  if (errors.length > 0) errors.forEach(e => console.error(`[STATS ENGINE] INVARIANT: ${e}`));

  return {
    currentStreak, maxStreak, activeDays, daysTracked, consistency,
    startDate, todayKey, days, gaps,
    isValid: errors.length === 0, errors,
  };
}

module.exports = { computeStats, getUTCDayKey, getISTDayKey, getDayKey, getNextDay, detectGaps };
