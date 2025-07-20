import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// Stack trace pentru debugging
function getStackTrace() {
  const stack = new Error().stack || '';
  const lines = stack.split('\n');
  // Găsește prima linie care nu e din axios sau React
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('.tsx') || line.includes('.ts')) {
      if (!line.includes('node_modules') && !line.includes('axios')) {
        return line.trim();
      }
    }
  }
  return 'Unknown source';
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug pentru /api/users request
    if (config.url?.includes('/users') || config.url?.includes('/bookings')) {
      const source = getStackTrace();
      console.log(`📍 Request source:`, source);
      console.log(`🔗 Full URL:`, config.url);
      console.log(`📌 BaseURL:`, config.baseURL);
    }

    // Detectează problema
    if (config.url && config.url.startsWith('/api/')) {
      console.warn('⚠️ PROBLEM: URL already contains /api/', {
        url: config.url,
        baseURL: config.baseURL,
        source: getStackTrace()
      });
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error.response?.data || error.message);
    }

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/');
      const isUploadEndpoint = url.includes('/upload/');
      
      if (!isAuthEndpoint && !isUploadEndpoint && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const publicPaths = ['/login', '/register', '/forgot-password', '/'];
        const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));
        
        if (!isPublicPath) {
          console.warn('401 error - would redirect to login but checking first...');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
