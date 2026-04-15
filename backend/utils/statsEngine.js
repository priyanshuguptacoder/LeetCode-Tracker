// ─── statsEngine.js — SINGLE SOURCE OF TRUTH for all streak/activity stats ───
// ALL metrics are derived exclusively from solvedDate fields.
// NEVER reads stored streak/activeDays/consistency from Settings.
// This module is the canonical implementation — import it everywhere.
//
// DATE BOUNDARY: UTC midnight (00:00 UTC) — matches LeetCode exactly.
// A solve at 19:01 UTC March 18 → "2026-03-18" ✓
// A solve at 23:50 UTC March 18 → "2026-03-18" ✓ (same LeetCode day)
// A solve at 00:30 UTC March 19 → "2026-03-19" ✓ (new LeetCode day)

// ─── UTC day key — ONE definition, used everywhere ───────────────────────────
function getUTCDayKey(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// ─── Next UTC day key ─────────────────────────────────────────────────────────
function getNextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return getUTCDayKey(d);
}

// ─── Gap detection — returns every missing day between solved days ────────────
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

// ─── isNextDay — strict 1-day difference check ───────────────────────────────
function isNextDay(prev, curr) {
  const d1 = new Date(prev + 'T00:00:00Z');
  const d2 = new Date(curr + 'T00:00:00Z');
  return (d2 - d1) / 86400000 === 1;
}

// ─── computeStats — pure, deterministic, self-validating ─────────────────────
// Input: array of objects with a solvedDate (Date | string | null)
//        optional calendarDates: YYYY-MM-DD UTC strings from LeetCode submissionCalendar
//        When calendarDates is provided and non-empty, it is used as the day set
//        for streak/activeDays instead of solvedDate — this matches LeetCode exactly.
// Output: { currentStreak, maxStreak, activeDays, daysTracked, consistency,
//           startDate, todayKey, days, gaps, isValid, errors }
function computeStats(problems, calendarDates = null) {
  const todayKey = getUTCDayKey(new Date());

  // Step 1: build canonical UTC day set
  const daySet = new Set();
  
  if (Array.isArray(calendarDates) && calendarDates.length > 0) {
    for (const k of calendarDates) {
      if (k && k <= todayKey) daySet.add(k);
    }
    console.log(`[STATS ENGINE] using submissionCalendar (${calendarDates.length} dates)`);
  }

  // ALWAYS merge problem dates so Codeforces isn't excluded
  for (const p of problems) {
    if (!p.solvedDate && !p.lastSubmittedAt) continue;
    const key = new Date(p.solvedDate || p.lastSubmittedAt).toISOString().split("T")[0];
    if (key <= todayKey) daySet.add(key);
  }
  
  console.log(`[STATS ENGINE] processed problem dates (${problems.length} problems)`);

  const days       = [...daySet].sort();
  const activeDays = daySet.size;

  console.log(`[STATS ENGINE] unique UTC days (${activeDays}): [${days.slice(-5).join(', ')}${days.length > 5 ? '…' : ''}]`);
  console.log(`[STATS ENGINE] todayKey: ${todayKey}`);

  // Step 2: edge case — no data
  if (activeDays === 0) {
    return {
      currentStreak: 0, maxStreak: 0, activeDays: 0,
      daysTracked: 0, consistency: 0,
      startDate: null, todayKey, days: [], gaps: [],
      isValid: true, errors: [],
    };
  }

  // Step 3: startDate and daysTracked
  const startDate  = days[0];
  const daysTracked = Math.round(
    (new Date(todayKey + 'T00:00:00Z') - new Date(startDate + 'T00:00:00Z')) / 86400000
  ) + 1;

  // Step 4: gap detection
  const gaps = detectGaps(days);

  // Step 5: streak logic
  let currentStreak = 0;
  let maxStreak = 0;
  let prevDate = null;

  for (let date of days) {
    if (!prevDate) {
      currentStreak = 1;
    } else {
      const diff = Math.round((new Date(date) - new Date(prevDate)) / 86400000);
      if (diff === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);
    prevDate = date;
  }

  // Step 6: today check
  const yesterdayKey = getUTCDayKey(new Date(Date.now() - 86400000));
  const alive = daySet.has(todayKey) || daySet.has(yesterdayKey);
  if (!alive) currentStreak = 0;

  // Step 7: consistency
  const consistency = daysTracked > 0 ? Math.round((activeDays / daysTracked) * 100) : 0;

  console.log(`[STATS ENGINE] current=${currentStreak} max=${maxStreak} active=${activeDays} tracked=${daysTracked} consistency=${consistency}% gaps=${gaps.length}`);

  // Step 8: invariant validation
  const errors = [];

  if (activeDays !== days.length) {
    errors.push(`activeDays mismatch: daySet.size=${activeDays} days.length=${days.length}`);
  }
  if (maxStreak > activeDays) {
    errors.push(`maxStreak (${maxStreak}) > activeDays (${activeDays}) — impossible`);
  }
  if (currentStreak > maxStreak) {
    errors.push(`currentStreak (${currentStreak}) > maxStreak (${maxStreak}) — impossible`);
  }

  if (!daySet.has(todayKey)) {
    console.warn(`[STATS ENGINE] today (${todayKey}) not in daySet — currentStreak will be 0 unless yesterday solved`);
  }

  if (errors.length > 0) {
    errors.forEach(e => console.error(`[STATS ENGINE] INVARIANT VIOLATION: ${e}`));
  }

  return {
    currentStreak,
    maxStreak,
    activeDays,
    daysTracked,
    consistency,
    startDate,
    todayKey,
    days,
    gaps,
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = { computeStats, getUTCDayKey, getNextDay, detectGaps };
