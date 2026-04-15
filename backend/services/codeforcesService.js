/**
 * Codeforces API Integration Service
 * Fetches user submissions, filters accepted solutions, deduplicates by problem
 */

const axios = require('axios');

const CF_API_BASE = 'https://codeforces.com/api';

/**
 * Normalize Codeforces rating to 1-5 difficulty scale
 * CONSISTENT THRESHOLDS with difficultyToString:
 * - <= 1000  → 1 (Easy)
 * - <= 1400  → 3 (Medium)
 * - > 1400   → 5 (Hard)
 */
function normalizeDifficulty(rating) {
  if (!rating) return 3; // Default to Medium
  if (rating <= 1000) return 1;  // Easy
  if (rating <= 1400) return 3; // Medium
  return 5; // Hard
}

/**
 * Convert rating to LeetCode-style string
 * CORRECT THRESHOLDS:
 * Easy <= 1000, Medium <= 1400, Hard > 1400
 */
function difficultyToString(rating) {
  if (!rating) return 'Medium';
  if (rating <= 1000) return 'Easy';
  if (rating <= 1400) return 'Medium';
  return 'Hard';
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
    const problemKey = `${contestId}-${index}`;

    if (!seen.has(problemKey)) {
      seen.set(problemKey, {
        contestId,
        index,
        name,
        rating,
        tags,
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
  const difficulty = difficultyToString(rating);
  const difficultyRating = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 3 : 5;

  return {
    id: `CF-${contestId}${index}`,
    contestId,
    index,
    title: name,
    platform: 'CF',
    rawDifficulty: rating || null,
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
  const existingIds = new Set(existingProblems.map(p => p.id));
  return cfProblems.filter(p => !existingIds.has(p.id));
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
};
