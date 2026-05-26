/**
 * Codeforces API Integration Service
 * Fetches user submissions, filters accepted solutions, deduplicates by problem
 */

const axios = require('axios');

const CF_API_BASE = 'https://codeforces.com/api';

/**
 * Normalize difficulty to 1-5 scale
 * Unknown/null → null, Easy → 1, Medium → 3, Hard → 5
 */
function normalizeDifficulty(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'unknown') return null;
    if (normalized === 'easy') return 1;
    if (normalized === 'medium') return 3;
    if (normalized === 'hard') return 5;
    return null;
  }
  if (typeof value === 'number') {
    return normalizeDifficulty(difficultyToString(value));
  }
  return null;
}

/**
 * Convert rating to LeetCode-style string
 * Easy <= 1100, Medium <= 1600, Hard > 1600
 */
function difficultyToString(rating) {
  if (rating == null) return 'Unknown';
  const numeric = Number(rating);
  if (!Number.isFinite(numeric)) return 'Unknown';
  if (numeric <= 1100) return 'Easy';
  if (numeric <= 1600) return 'Medium';
  return 'Hard';
}

function getContestType(contestName) {
  if (!contestName || typeof contestName !== 'string') return null;
  const name = contestName.toLowerCase();

  if (
    name.includes('gym') ||
    name.includes('mashup') ||
    name.includes('april fools') ||
    name.includes('unknown contest') ||
    name.trim() === 'unknown'
  ) {
    return null;
  }

  if (
    name.includes('div. 1 + div. 2') ||
    name.includes('div.1 + div.2') ||
    name.includes('div.1+div.2') ||
    name.includes('div. 1+div. 2')
  ) {
    return 'div1+div2';
  }
  if (name.includes('div. 1') || name.includes('div.1')) return 'div1';
  if (name.includes('div. 2') || name.includes('div.2')) return 'div2';
  if (name.includes('div. 3') || name.includes('div.3')) return 'div3';
  if (name.includes('div. 4') || name.includes('div.4')) return 'div4';
  if (name.includes('educational')) return 'educational';
  if (name.includes('global')) return 'global';
  return null;
}

const ESTIMATED_RATINGS = {
  div4: { A: 800, B: 900, C: 1000, D: 1100, E: 1200, F: 1400, G: 1600, H: 1800 },
  div3: { A: 800, B: 1000, C: 1200, D: 1400, E: 1600, F: 1800, G: 2000 },
  div2: { A: 900, B: 1200, C: 1500, D: 1800, E: 2100, F: 2400 },
  'div1+div2': { A: 1200, B: 1500, C: 1800, D: 2100, E: 2400, F: 2700 },
  div1: { A: 1600, B: 1900, C: 2200, D: 2500, E: 2800, F: 3100 },
  educational: { A: 900, B: 1100, C: 1300, D: 1500, E: 1700, F: 2000, G: 2300 },
  global: { A: 1000, B: 1300, C: 1600, D: 1900, E: 2200, F: 2500 },
};

function estimateRating(problem) {
  const contestType = getContestType(problem?.contestName);
  if (!contestType) {
    if (problem?.rating == null) {
      console.warn(`[CF] Unknown contest type for estimation: ${problem?.contestName}`);
    }
    return null;
  }

  const trimmedIndex = (problem?.index || '').toString().trim();
  if (!trimmedIndex) return null;
  const indexKey = trimmedIndex.charAt(0).toUpperCase();

  return ESTIMATED_RATINGS[contestType]?.[indexKey] ?? null;
}

/**
 * Fetch user contest rating history from Codeforces API
 * Returns rating data array and contest count
 * SAFETY: Always returns array (empty if API fails)
 * @param {string} handle - Codeforces handle
 */
async function fetchUserContestData(handle) {
  try {
    const url = `${CF_API_BASE}/user.rating?handle=${encodeURIComponent(handle)}`;
    const { data } = await axios.get(url, { timeout: 10000 });

    if (data?.status !== 'OK') {
      console.warn('[CF] Contest data fetch failed:', data?.comment || 'Unknown error');
      return { ratingHistory: [], contestCount: 0 };
    }

    const ratingHistory = Array.isArray(data?.result) ? data.result : [];
    const contestCount = ratingHistory.length;

    // Get current rating (last entry) or null if no contests
    const currentRating = contestCount > 0
      ? ratingHistory[ratingHistory.length - 1]?.newRating
      : null;

    // Get max rating from history
    const maxRating = ratingHistory.length > 0
      ? Math.max(...ratingHistory.map(r => r.newRating || 0))
      : null;

    return {
      ratingHistory,
      contestCount,
      currentRating,
      maxRating,
    };
  } catch (err) {
    console.error('[CF] Contest data fetch error:', err.message);
    // SAFE FALLBACK: Return empty data, don't crash
    return { ratingHistory: [], contestCount: 0, currentRating: null, maxRating: null };
  }
}

/**
 * Fetch user info from Codeforces API (extended with contest stats)
 * @param {string} handle - Codeforces handle
 */
async function fetchUserInfo(handle) {
  try {
    const { data } = await axios.get(`${CF_API_BASE}/user.info`, {
      params: { handles: handle },
      timeout: 10000,
    });

    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment}`);
    }

    return data.result[0];
  } catch (err) {
    console.error('[CF] Failed to fetch user info:', err.message);
    throw err;
  }
}

/**
 * Fetch all submissions for a user
 * @param {string} handle - Codeforces handle
 * @param {number} count - Max submissions to fetch (default: all)
 */
async function fetchUserSubmissions(handle, count = null) {
  try {
    const params = { handle };
    if (count) params.count = count;

    const { data } = await axios.get(`${CF_API_BASE}/user.status`, {
      params,
      timeout: 15000,
    });

    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment}`);
    }

    return data.result;
  } catch (err) {
    console.error('[CF] Failed to fetch submissions:', err.message);
    throw err;
  }
}

/**
 * Deduplicate problems by contestId + index
 * Keep the earliest accepted submission for each problem
 * 
 * @param {Array} submissions - Raw submissions from CF API
 * @returns {Array} Unique accepted problems
 */
function deduplicateProblems(submissions) {
  const seen = new Map();
  const acceptedSubmissions = submissions.filter(s => s.verdict === 'OK');
  
  // Sort ascending by creation time to ensure we keep the EARLIEST submission
  acceptedSubmissions.sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);

  for (const sub of acceptedSubmissions) {
    const { contestId, index, name, rating, tags = [] } = sub.problem;
    const contestName = sub.contestName || sub.problem?.contestName || null;
    const problemKey = `${contestId}-${index}`;

    if (!seen.has(problemKey)) {
      seen.set(problemKey, {
        contestId,
        index,
        name,
        rating,
        tags,
        contestName,
        solvedAt: new Date(sub.creationTimeSeconds * 1000),
        submissionId: sub.id,
      });
    }
  }

  return Array.from(seen.values());
}

/**
 * Transform Codeforces problem to our schema format
 * 
 * @param {Object} cfProblem - Deduplicated CF problem
 * @returns {Object} Transformed problem matching our schema
 */
function transformToSchema(cfProblem) {
  const { contestId, index, name, rating, tags, solvedAt } = cfProblem;
  const officialRating = rating != null ? Number(rating) : null;
  const estimatedRating = estimateRating(cfProblem);
  const finalRating = officialRating ?? estimatedRating ?? null;
  const difficulty = difficultyToString(finalRating);
  const difficultyRating = normalizeDifficulty(finalRating);
  let ratingSource = 'unknown';
  if (officialRating != null) {
    ratingSource = 'official';
  } else if (estimatedRating != null) {
    ratingSource = 'estimated';
  }

  const cid = Number(contestId);
  const idx = (index || '').toString().trim().toUpperCase();
  const uniqueId = `CF-${cid}${idx}`;

  return {
    uniqueId,
    id: uniqueId, // legacy alias
    contestId: cid,
    index: idx,
    title: name,
    platform: 'CF',
    officialRating: officialRating ?? null,
    estimatedRating,
    rating: finalRating,
    ratingSource,
    isEstimated: officialRating == null && estimatedRating != null,
    rawDifficulty: officialRating ?? null,
    difficultyRating,
    difficulty: difficulty,
    tags: tags || [],
    solved: true,
    solvedDate: solvedAt,
    lastSubmittedAt: solvedAt,
    platformLink: `https://codeforces.com/problemset/problem/${contestId}/${index}`,
    leetcodeLink: `https://codeforces.com/problemset/problem/${contestId}/${index}`, // legacy compatibility
    providerTitle: 'Codeforces',
    // Revision tracking defaults
    revisionCount: 0,
    confidence: 3,
    easeFactor: 2.5,
    interval: 1,
    isDeleted: false,
  };
}

/**
 * Main sync function: fetch, filter, dedupe, and transform CF problems
 * 
 * @param {string} handle - Codeforces handle
 * @returns {Object} Sync result with problems array
 */
async function syncCodeforcesProblems(handle) {
  console.log(`[CF] Starting sync for handle: ${handle}`);

  try {
    // 1. Fetch user info for validation
    const userInfo = await fetchUserInfo(handle);
    console.log(`[CF] User validated: ${userInfo.handle} (rating: ${userInfo.rating || 'N/A'})`);

    // 2. Fetch all submissions
    const rawSubmissions = await fetchUserSubmissions(handle);
    const submissions = Array.isArray(rawSubmissions) ? rawSubmissions : [];
    console.log(`[CF] Fetched ${submissions.length} total submissions`);

    // 3. Filter accepted and deduplicate
    const uniqueProblems = deduplicateProblems(submissions);
    console.log(`[CF] Found ${uniqueProblems.length} unique solved problems`);

    // 4. Transform to schema format
    const transformedProblems = uniqueProblems.map(transformToSchema);

    return {
      success: true,
      handle: userInfo.handle,
      rating: userInfo.rating,
      maxRating: userInfo.maxRating,
      totalFetched: submissions.length,
      uniqueAccepted: uniqueProblems.length,
      problems: transformedProblems,
    };
  } catch (err) {
    console.error('[CF] Sync failed:', err.message);
    return {
      success: false,
      error: err.message,
      problems: [],
    };
  }
}

/**
 * Compare with existing DB problems and return only new ones
 * 
 * @param {Array} cfProblems - Transformed CF problems
 * @param {Array} existingProblems - Problems already in DB
 * @returns {Array} New problems not in DB
 */
function filterNewProblems(cfProblems, existingProblems) {
  const existingIds = new Set(existingProblems.map(p => p.uniqueId));
  return cfProblems.filter(p => !existingIds.has(p.uniqueId));
}

module.exports = {
  syncCodeforcesProblems,
  fetchUserSubmissions,
  fetchUserInfo,
  fetchUserContestData,
  deduplicateProblems,
  transformToSchema,
  filterNewProblems,
  normalizeDifficulty,
  difficultyToString,
  getContestType,
  estimateRating,
};
