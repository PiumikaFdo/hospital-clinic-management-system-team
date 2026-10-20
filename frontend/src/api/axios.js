import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hms_token');
      localStorage.removeItem('hms_user');
      const publicPaths = ['/', '/login', '/book-appointment', '/book-lab-test'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default API;
