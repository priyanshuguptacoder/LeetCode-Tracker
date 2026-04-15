// ─── API Configuration ───────────────────────────────────────────────────────
// LOCAL: http://localhost:5001/api
// PRODUCTION: Render backend

const LOCAL_API_URL = 'http://localhost:5001/api';
const PRODUCTION_API_URL = 'https://leetcode-tracker-backend-kpuw.onrender.com/api';

const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '';

const API_BASE_URL = isLocalhost ? LOCAL_API_URL : PRODUCTION_API_URL;

// ─── API ─────────────────────────────────────────────────────────────────────
const api = {
  getAllProblems: async (opts = {}) => {
    // Accept either a plain string (legacy) or an options object { platform }
    const platform = (typeof opts === 'string' ? opts : opts.platform) || 'ALL';
    const params   = `?platform=${platform}`;
    console.log('[API] getAllProblems', `${API_BASE_URL}/problems${params}`);
    const r = await fetch(`${API_BASE_URL}/problems${params}`);
    if (!r.ok) throw new Error('Failed to fetch problems');
    return r.json();
  },
  createProblem: async (data) => {
    const r = await fetch(`${API_BASE_URL}/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to create problem'); }
    return r.json();
  },
  updateProblem: async (id, updates) => {
    const r = await fetch(`${API_BASE_URL}/problems/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!r.ok) throw new Error('Failed to update problem');
    return r.json();
  },
  deleteProblem: async (id) => {
    const r = await fetch(`${API_BASE_URL}/problems/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Failed to delete problem');
    return r.json();
  },
  reviseProblem: async (id, data = {}) => {
    const r = await fetch(`${API_BASE_URL}/problems/${id}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to record revision'); }
    return r.json();
  },
  setMistakeType: async (id, mistakeType) => {
    const r = await fetch(`${API_BASE_URL}/problems/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mistakeType, needsRevision: true }),
    });
    if (!r.ok) throw new Error('Failed to set mistake type');
    return r.json();
  },
  unreviseProblem: async (id) => {
    const r = await fetch(`${API_BASE_URL}/problems/${id}/unrevise`, { method: 'POST' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to unrevise'); }
    return r.json();
  },
  targetProblem: async (id) => {
    const r = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(id)}/target`, { method: 'POST' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to target problem'); }
    return r.json();
  },
  untargetProblem: async (id) => {
    const r = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(id)}/untarget`, { method: 'POST' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to untarget problem'); }
    return r.json();
  },
  toggleTarget: async (id) => {
    const r = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(id)}/target`, { method: 'PATCH' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to toggle target'); }
    return r.json();
  },
  toggleStriver: async (id) => {
    const r = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(id)}/striver`, { method: 'PATCH' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to toggle striver'); }
    return r.json();
  },
  toggleTLE: async (id) => {
    const r = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(id)}/tle`, { method: 'PATCH' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to toggle TLE'); }
    return r.json();
  },
  getStriverStats: async () => {
    const r = await fetch(`${API_BASE_URL}/problems/striver-stats`);
    if (!r.ok) throw new Error('Failed to fetch striver stats');
    return r.json();
  },
  getTLEStats: async () => {
    const r = await fetch(`${API_BASE_URL}/problems/tle-stats`);
    if (!r.ok) throw new Error('Failed to fetch TLE stats');
    return r.json();
  },
  getStreak: async () => {
    const r = await fetch(`${API_BASE_URL}/problems/streak`);
    if (!r.ok) throw new Error('Failed to fetch streak');
    return r.json();
  },
  getRevisionList: async () => {
    const r = await fetch(`${API_BASE_URL}/problems/revision-list`);
    if (!r.ok) throw new Error('Failed to fetch revision list');
    return r.json();
  },
  getSuggestions: async () => {
    const r = await fetch(`${API_BASE_URL}/problems/suggestions`);
    if (!r.ok) throw new Error('Failed to fetch suggestions');
    return r.json();
  },
  syncLeetCode: async () => {
    const r = await fetch(`${API_BASE_URL}/problem/sync`, { method: 'POST' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Sync failed'); }
    return r.json();
  },
  syncAll: async () => {
    const r = await fetch(`${API_BASE_URL}/sync/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || e.message || 'Sync all failed'); }
    return r.json();
  },
  syncCalendar: async () => {
    const r = await fetch(`${API_BASE_URL}/problem/sync/calendar`, { method: 'POST' });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Calendar sync failed'); }
    return r.json();
  },
  getSyncStatus: async () => {
    const r = await fetch(`${API_BASE_URL}/problem/sync/status`);
    if (!r.ok) return { status: 'expired' };
    return r.json();
  },
  getRecentAndToday: async (debug = false) => {
    const url = debug
      ? `${API_BASE_URL}/problem/recent-and-today?debug=true`
      : `${API_BASE_URL}/problem/recent-and-today`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Failed to fetch recent/today problems');
    return r.json();
  },
  getRecentProblems: async () => {
    const r = await fetch(`${API_BASE_URL}/problem/recent`);
    if (!r.ok) throw new Error('Failed to fetch recent problems');
    return r.json();
  },
  getTodayProblems: async () => {
    const r = await fetch(`${API_BASE_URL}/problem/today`);
    if (!r.ok) throw new Error('Failed to fetch today\'s problems');
    return r.json();
  },
  // ─── Platform Filtered Problems ─────────────────────────────────────────────
  getProblemsByPlatform: async (platform = 'ALL') => {
    const r = await fetch(`${API_BASE_URL}/problems?platform=${platform}`);
    if (!r.ok) throw new Error('Failed to fetch problems by platform');
    return r.json();
  },
  // ─── Codeforces APIs ─────────────────────────────────────────────────────────
  syncCodeforces: async (handle) => {
    const r = await fetch(`${API_BASE_URL}/codeforces/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(handle ? { handle } : {}),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Codeforces sync failed'); }
    return r.json();
  },
  getCodeforcesInfo: async (handle) => {
    const url = handle 
      ? `${API_BASE_URL}/codeforces/info?handle=${encodeURIComponent(handle)}`
      : `${API_BASE_URL}/codeforces/info`;
    const r = await fetch(url);
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to fetch Codeforces info'); }
    return r.json();
  },
  getCodeforcesStats: async () => {
    const r = await fetch(`${API_BASE_URL}/codeforces/stats`);
    if (!r.ok) throw new Error('Failed to fetch Codeforces stats');
    return r.json();
  },
  getContestStats: async () => {
    const r = await fetch(`${API_BASE_URL}/analytics/contest`);
    if (!r.ok) throw new Error('Failed to fetch contest stats');
    return r.json();
  },
  getStreakByPlatform: async () => {
    const r = await fetch(`${API_BASE_URL}/analytics/streak-by-platform`);
    if (!r.ok) throw new Error('Failed to fetch streak by platform');
    return r.json();
  },
};

window.API = api;
window.API_BASE_URL = API_BASE_URL;
console.log('[API] Base URL:', API_BASE_URL);
