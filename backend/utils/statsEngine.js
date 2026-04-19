// ─── statsEngine.js — SINGLE SOURCE OF TRUTH for all streak/activity stats ───
//
// DATE BOUNDARIES (strict, per platform):
//   LC      → UTC midnight  (matches LeetCode's own day boundary)
//   CF      → IST midnight  (Asia/Kolkata, UTC+5:30)
//   GLOBAL  → UTC midnight  (same as LC)
//
// A CF solve at 12:30 AM IST = 7:00 PM UTC previous day:
//   CF_dayKey  = IST today   ✓
//   globalKey  = UTC yesterday ✓  (EXPECTED — do not "fix" this)

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getUTCDayKey(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function getISTDayKey(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`;
}

// CF → IST, everything else (LC / GLOBAL / ALL) → UTC
function getDayKey(date, platform) {
  return platform === 'CF' ? getISTDayKey(date) : getUTCDayKey(date);
}

function getPrevDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function getNextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function detectGaps(sortedDays) {
  const gaps = [];
  for (let i = 0; i < sortedDays.length - 1; i++) {
    let expected = getNextDay(sortedDays[i]);
    while (expected < sortedDays[i + 1]) { gaps.push(expected); expected = getNextDay(expected); }
  }
  return gaps;
}

function isNextDay(prev, curr) {
  return (new Date(curr + 'T00:00:00Z') - new Date(prev + 'T00:00:00Z')) / 86400000 === 1;
}

// ─── Debug: log edge-case submissions (00:00–06:00 IST) ──────────────────────
function logEdgeCase(raw, platform) {
  const d = new Date(raw);
  const istHour = ((d.getUTCHours() * 60 + d.getUTCMinutes() + 330) % 1440) / 60;
  if (istHour >= 0 && istHour < 6) {
    console.log(`[STATS EDGE] platform=${platform} IST_time=${getISTDayKey(d)}T${String(Math.floor(istHour)).padStart(2,'0')}:xx UTC_time=${getUTCDayKey(d)} platformDayKey=${getDayKey(d,platform)} globalDayKey=${getUTCDayKey(d)}`);
  }
}

// ─── computeStreak ────────────────────────────────────────────────────────────
function computeStreak(sortedDays, todayKey) {
  if (!sortedDays.length) return { currentStreak: 0, maxStreak: 0 };

  // Max streak — full scan
  let maxStreak = 1, temp = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    if (isNextDay(sortedDays[i - 1], sortedDays[i])) { temp++; maxStreak = Math.max(maxStreak, temp); }
    else temp = 1;
  }
  maxStreak = Math.max(maxStreak, 1);

  // Current streak — alive if last solve was today OR yesterday
  const yesterdayKey = getPrevDay(todayKey);
  const daySet       = new Set(sortedDays);
  const anchor       = daySet.has(todayKey) ? todayKey : daySet.has(yesterdayKey) ? yesterdayKey : null;

  if (!anchor) return { currentStreak: 0, maxStreak };

  const idx = sortedDays.lastIndexOf(anchor);
  let currentStreak = 1;
  for (let i = idx - 1; i >= 0; i--) {
    if (isNextDay(sortedDays[i], sortedDays[i + 1])) currentStreak++;
    else break;
  }

  return { currentStreak, maxStreak };
}

// ─── Validation ───────────────────────────────────────────────────────────────
const VALID_PLATFORMS = new Set(['LC', 'CF']);
const DAY_KEY_RE      = /^\d{4}-\d{2}-\d{2}$/;

function isValidDayKey(k) { return typeof k === 'string' && DAY_KEY_RE.test(k); }

// ─── computeStats — main entry point ─────────────────────────────────────────
// platformHint: 'LC' | 'CF' | 'ALL'
function computeStats(problems, calendarDates = null, platformHint = 'ALL') {
  const now      = new Date();
  const todayKey = platformHint === 'CF' ? getISTDayKey(now) : getUTCDayKey(now);

  const daySet = new Set();
  let skipped = 0, edgeCases = 0, corrections = 0, errors = 0;
  const warnings = [];

  // Merge LeetCode submission calendar (UTC — only for LC / ALL)
  if (platformHint !== 'CF' && Array.isArray(calendarDates) && calendarDates.length > 0) {
    for (const k of calendarDates) {
      if (isValidDayKey(k) && k <= todayKey) daySet.add(k);
    }
    console.log(`[STATS ENGINE] calendar merged: ${calendarDates.length} UTC dates`);
  }

  // Process problems
  for (const p of problems) {
    const raw = p.solvedDate || p.lastSubmittedAt;

    // STEP 1: validate input
    if (!raw) { skipped++; continue; }
    const d = new Date(raw);
    if (isNaN(d.getTime())) { skipped++; errors++; continue; }
    if (d > now)            { skipped++; continue; } // future — skip

    // STEP 1b: strict platform check — NO fallback for unknown platforms
    const plat = (platformHint === 'ALL') ? p.platform : platformHint;
    if (!plat || !VALID_PLATFORMS.has(plat)) {
      console.error(`[STATS ENGINE] unknown platform "${plat}" on ${p.uniqueId || raw} — skipping`);
      skipped++; errors++;
      continue;
    }

    // STEP 2: generate day keys
    const platformDayKey = getDayKey(d, plat);
    const globalDayKey   = getUTCDayKey(d);

    if (!isValidDayKey(platformDayKey) || !isValidDayKey(globalDayKey)) {
      skipped++; errors++;
      continue;
    }

    // STEP 3: cross-timezone assertion for CF
    if (plat === 'CF') {
      const expectedIST = getISTDayKey(d);
      const expectedUTC = getUTCDayKey(d);
      if (platformDayKey !== expectedIST) {
        console.error(`[STATS ENGINE] CF dayKey mismatch: got ${platformDayKey} expected ${expectedIST}`);
        errors++;
      }
      if (globalDayKey !== expectedUTC) {
        console.error(`[STATS ENGINE] CF globalKey mismatch: got ${globalDayKey} expected ${expectedUTC}`);
        errors++;
      }
    }

    // STEP 4: edge-case detection — 00:00–06:00 IST
    const istHour = ((d.getUTCHours() * 60 + d.getUTCMinutes() + 330) % 1440) / 60;
    if (istHour >= 0 && istHour < 6) {
      edgeCases++;
      console.log(`[STATS EDGE] platform=${plat} IST=${getISTDayKey(d)}T${String(Math.floor(istHour)).padStart(2,'0')}:xx UTC=${getUTCDayKey(d)} platformDayKey=${platformDayKey} globalDayKey=${globalDayKey}`);
    }

    if (platformDayKey <= todayKey) daySet.add(platformDayKey);
  }

  if (edgeCases > 5) warnings.push(`High edge-case count: ${edgeCases} submissions between 00:00–06:00 IST`);
  if (skipped > 0)   console.warn(`[STATS ENGINE] skipped=${skipped} errors=${errors}`);

  // STEP 5: sort + sanitize (deduplicate is implicit via Set)
  const days       = [...daySet].sort();
  const activeDays = daySet.size;

  console.log(`[STATS ENGINE] platform=${platformHint} today=${todayKey} active=${activeDays} last5=[${days.slice(-5).join(',')}]`);

  if (activeDays === 0) {
    return { currentStreak:0, maxStreak:0, activeDays:0, daysTracked:0, consistency:0,
             startDate:null, todayKey, days:[], gaps:[], isValid:true, errors:[], warnings,
             _meta: { skipped, corrections, errorsDetected: errors } };
  }

  const startDate   = days[0];
  const daysTracked = Math.round(
    (new Date(todayKey + 'T00:00:00Z') - new Date(startDate + 'T00:00:00Z')) / 86400000
  ) + 1;

  const gaps = detectGaps(days);
  let { currentStreak, maxStreak } = computeStreak(days, todayKey);
  const consistency = daysTracked > 0 ? Math.round((activeDays / daysTracked) * 100) : 0;

  console.log(`[STATS ENGINE] current=${currentStreak} max=${maxStreak} active=${activeDays} tracked=${daysTracked} consistency=${consistency}%`);

  // STEP 6: invariant check + auto-heal
  const invariantErrors = [];
  if (activeDays !== days.length) invariantErrors.push(`activeDays mismatch: ${activeDays} vs ${days.length}`);
  if (maxStreak > activeDays)     invariantErrors.push(`maxStreak(${maxStreak}) > activeDays(${activeDays})`);
  if (currentStreak > maxStreak)  invariantErrors.push(`currentStreak(${currentStreak}) > maxStreak(${maxStreak})`);

  if (invariantErrors.length > 0) {
    invariantErrors.forEach(e => console.error(`[STATS ENGINE] INVARIANT: ${e}`));
    // Full rebuild from raw days (already deduped + sorted)
    const healed = computeStreak(days, todayKey);
    currentStreak = Math.min(healed.currentStreak, activeDays);
    maxStreak     = Math.min(healed.maxStreak, activeDays);
    corrections++;
    warnings.push(...invariantErrors.map(e => `AUTO-HEALED: ${e}`));
  }

  return {
    currentStreak, maxStreak, activeDays, daysTracked, consistency,
    startDate, todayKey, days, gaps,
    isValid: invariantErrors.length === 0,
    errors: invariantErrors,
    warnings,
    _meta: { skipped, corrections, errorsDetected: errors },
  };
}

module.exports = { computeStats, getUTCDayKey, getISTDayKey, getDayKey, getPrevDay, getNextDay, detectGaps };