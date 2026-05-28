/* ============================================================
   PrintFlow 3D — API Utility
   ============================================================
   Centralized HTTP client with JWT token management.
   All requests go through the Vite proxy at /api.
   ============================================================ */

const TOKEN_KEY = 'printflow_token';

// ── Token helpers ────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Core request function ────────────────────────────────────

/**
 * Makes an authenticated API request.
 *
 * @param {string} endpoint - API endpoint (e.g. '/api/sales')
 * @param {object} options  - fetch options override
 * @param {string} options.method  - HTTP method
 * @param {object} options.body    - request body (will be JSON-stringified)
 * @param {object} options.headers - additional headers
 * @returns {Promise<any>} parsed JSON response
 * @throws {Error} with message from API or status text
 */
export async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, config);

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    // If JSON parsing fails on a successful response, return null
    if (response.ok) return null;
    throw new Error(response.statusText || 'Error de conexión con el servidor');
  }

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      data?.msg ||
      `Error ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ── Convenience methods ──────────────────────────────────────

export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),

  post: (url, data) => apiRequest(url, { method: 'POST', body: data }),

  put: (url, data) => apiRequest(url, { method: 'PUT', body: data }),

  delete: (url) => apiRequest(url, { method: 'DELETE' }),
};

export default api;
