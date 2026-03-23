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
  // Prefer calendarDates (LeetCode submission calendar) when available.
  const daySet = new Set();

  if (Array.isArray(calendarDates) && calendarDates.length > 0) {
    for (const k of calendarDates) {
      if (k && k <= todayKey) daySet.add(k);
    }
    console.log(`[STATS ENGINE] using submissionCalendar (${calendarDates.length} dates)`);
  } else {
    for (const p of problems) {
      if (!p.solvedDate) continue;
      const key = getUTCDayKey(p.solvedDate);
      if (key <= todayKey) daySet.add(key);
    }
    console.log(`[STATS ENGINE] using problem solvedDates (${problems.length} problems)`);
  }

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

  // Step 5: max streak — full sequence scan
  let maxStreak = 1, temp = 1;
  for (let i = 1; i < days.length; i++) {
    if (isNextDay(days[i - 1], days[i])) {
      temp++;
      maxStreak = Math.max(maxStreak, temp);
    } else {
      temp = 1;
    }
  }
  maxStreak = Math.max(maxStreak, 1);

  // Step 6: current streak — walk back from today OR yesterday (UTC)
  // A streak is still alive if the user solved yesterday but not yet today.
  // Only break if the last active day was 2+ days ago.
  const yesterdayKey = getUTCDayKey(new Date(Date.now() - 86400000));
  const startCursor = daySet.has(todayKey) ? todayKey : (daySet.has(yesterdayKey) ? yesterdayKey : null);

  let currentStreak = 0;
  if (startCursor) {
    let cursor = new Date(startCursor + 'T00:00:00Z');
    while (true) {
      const key = getUTCDayKey(cursor);
      if (daySet.has(key)) {
        currentStreak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

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
