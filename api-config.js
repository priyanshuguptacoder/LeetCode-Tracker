// API Configuration
// For local development
const LOCAL_API_URL = 'http://localhost:5001/api';

// For production - Render backend URL
// This will be your backend service URL on Render
const PRODUCTION_API_URL = 'https://leetcode-tracker-backend.onrender.com/api';

// Auto-detect environment
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '';

const API_BASE_URL = isLocalhost ? LOCAL_API_URL : PRODUCTION_API_URL;

// Log current configuration (for debugging)
console.log('🔧 API Configuration:', {
  environment: isLocalhost ? 'LOCAL' : 'PRODUCTION',
  baseURL: API_BASE_URL,
  hostname: window.location.hostname
});

const api = {
  // Get all problems
  getAllProblems: async () => {
    const response = await fetch(`${API_BASE_URL}/problems`);
    if (!response.ok) throw new Error('Failed to fetch problems');
    return response.json();
  },

  // Get single problem
  getProblem: async (number) => {
    const response = await fetch(`${API_BASE_URL}/problems/${number}`);
    if (!response.ok) throw new Error('Failed to fetch problem');
    return response.json();
  },

  // Create problem
  createProblem: async (problemData) => {
    const response = await fetch(`${API_BASE_URL}/problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(problemData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create problem');
    }
    return response.json();
  },

  // Update problem
  updateProblem: async (number, updates) => {
    const response = await fetch(`${API_BASE_URL}/problems/${number}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update problem');
    return response.json();
  },

  // Delete problem
  deleteProblem: async (number) => {
    const response = await fetch(`${API_BASE_URL}/problems/${number}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete problem');
    return response.json();
  },

  // Get stats
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
};

// Export for use in script.js
window.API = api;
window.API_BASE_URL = API_BASE_URL;
