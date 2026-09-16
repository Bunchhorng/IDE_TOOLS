import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// While a run is active (batch poll, live session), suppress the full-page
// 401 reload so editor state is not thrown away mid-execution.
let suppress401Reload = false;
export function setSuppress401Reload(value: boolean) {
  suppress401Reload = value;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const authEndpoint = /^\/auth\/(login|register|guest|upgrade)(\?|$)/.test(
      error.config?.url ?? '',
    );
    if (
      error.response?.status === 401 &&
      !authEndpoint &&
      !suppress401Reload &&
      !sessionStorage.getItem('guest_recovery')
    ) {
      // Session expired/invalid: drop it and let AuthContext provision a
      // fresh guest session on next boot, staying on the same route.
      sessionStorage.setItem('guest_recovery', '1');
      localStorage.removeItem('auth_token');
      const target = window.location.pathname + window.location.search;
      window.location.href = target === '/' ? '/dashboard' : target;
    }
    return Promise.reject(error);
  },
);

export default api;
