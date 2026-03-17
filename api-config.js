// ─── API Configuration ───────────────────────────────────────────────────────
// LOCAL: http://localhost:5001/api
// PRODUCTION: your Render backend URL — update PRODUCTION_API_URL below

const LOCAL_API_URL = 'http://localhost:5001/api';
const PRODUCTION_API_URL = 'https://leetcode-tracker-backend-kpuw.onrender.com/api'; // Render backend

const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '';

const API_BASE_URL = isLocalhost ? LOCAL_API_URL : PRODUCTION_API_URL;

console.log('🔧 API:', API_BASE_URL);

// ─── Core API ────────────────────────────────────────────────────────────────
const api = {
  getAllProblems: async () => {
    const r = await fetch(`${API_BASE_URL}/problems`);
    if (!r.ok) throw new Error('Failed to fetch problems');
    return r.json();
  },
  getProblem: async (id) => {
    const r = await fetch(`${API_BASE_URL}/problems/${id}`);
    if (!r.ok) throw new Error('Failed to fetch problem');
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
  getStats: async () => {
    const r = await fetch(`${API_BASE_URL}/problems/stats`);
    if (!r.ok) throw new Error('Failed to fetch stats');
    return r.json();
  },
  getSettings: async () => {
    const r = await fetch(`${API_BASE_URL}/problems/settings`);
    if (!r.ok) throw new Error('Failed to fetch settings');
    return r.json();
  },
  alignProblems: async (problems, timeZone) => {
    const r = await fetch(`${API_BASE_URL}/problems/align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problems, timeZone }),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Align failed'); }
    return r.json();
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function fetchProblems() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error-msg');
  if (loadingEl) loadingEl.style.display = 'block';
  if (errorEl) errorEl.style.display = 'none';
  try {
    const res = await api.getAllProblems();
    return res.data || [];
  } catch (err) {
    console.error('fetchProblems error:', err);
    if (errorEl) { errorEl.textContent = `Failed to load: ${err.message}`; errorEl.style.display = 'block'; }
    return [];
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

async function markSolved(id, solved = true) {
  const res = await api.updateProblem(id, { solved, solvedDate: solved ? new Date().toISOString() : null });
  return res.data;
}

async function updateNotes(id, note) {
  const res = await api.updateProblem(id, { notes: note });
  return res.data;
}

window.API = api;
window.API_BASE_URL = API_BASE_URL;
window.fetchProblems = fetchProblems;
window.markSolved = markSolved;
window.updateNotes = updateNotes;
