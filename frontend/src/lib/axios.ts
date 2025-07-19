import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Pentru producție, folosește URL relativ pentru a folosi proxy-ul din Next.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api', // Folosește /api relativ când nu e setat API_URL
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
  transitional: {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false,
  }
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log pentru debugging în development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log error în development
    if (process.env.NODE_ENV === 'development') {
      const isAuthMeError = error.config?.url?.includes('auth/me') && error.response?.status === 404;
      if (!isAuthMeError) {
        console.error('API Error:', error.response?.data || error.message);
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear auth data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      // Redirect to login DOAR dacă:
      // 1. Suntem în browser
      // 2. NU suntem deja pe o pagină publică
      // 3. NU e o eroare de auth/me (care poate fi normală la început)
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/'];
        const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));
        const isAuthMeRequest = error.config?.url?.includes('/auth/me');
        
        // Redirect doar dacă NU suntem pe o pagină publică și NU e request de auth/me
        if (!isPublicPath && !isAuthMeRequest) {
          console.log('🔐 Redirecting to login due to 401 error');
          window.location.href = '/login';
        } else if (isAuthMeRequest) {
          console.log('ℹ️ Auth check failed, but not redirecting from auth/me request');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;