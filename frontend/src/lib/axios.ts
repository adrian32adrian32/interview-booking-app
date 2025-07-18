import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`, // IMPORTANT: Adăugat /api la baseURL
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 seconds
  // Fix pentru warnings
  transitional: {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false,
  }
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Verifică dacă suntem pe client-side
    if (typeof window !== 'undefined') {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Log request în development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    // Log response în development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Response:`, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log error în development doar pentru erori non-404 pe auth/me
    if (process.env.NODE_ENV === 'development') {
      const isAuthMeError = error.config?.url?.includes('auth/me') && error.response?.status === 404;
      if (!isAuthMeError) {
        console.error(`❌ Response error:`, error.response?.status, error.response?.data);
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Verifică dacă suntem pe client-side
      if (typeof window !== 'undefined') {
        // Token might be expired, try to refresh
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post(`${API_URL}/api/auth/refresh`, {
              refreshToken
            });

            const { token } = response.data;
            localStorage.setItem('token', token);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          window.location.href = '/login';
        }
      }
    }

    // Handle other errors - nu loga 404 pentru auth/me
    if (error.response?.status === 403) {
      console.error('Forbidden: Nu ai permisiunea pentru această acțiune');
    }

    if (error.response?.status === 404) {
      const isAuthMeError = error.config?.url?.includes('auth/me');
      if (!isAuthMeError) {
        console.error('Not Found: Resursa nu a fost găsită');
      }
    }

    if (error.response?.status === 500) {
      console.error('Server Error: A apărut o eroare pe server');
    }

    return Promise.reject(error);
  }
);

// Helper functions
export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!localStorage.getItem('token');
};

// Export instance
export default api;