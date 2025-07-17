import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor pentru a adăuga token
api.interceptors.request.use(
  (config) => {
    // HACK temporar - folosește ruta fără validare pentru login
    if (config.url === '/auth/login') {
      console.log('🔄 Redirecting login to no-validation route');
      config.url = '/auth/login-no-validation';
    }
    
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log pentru debug
    console.log('📤 API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('📤 Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor pentru error handling
api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('📥 Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      // Token expirat sau invalid
      Cookies.remove('token');
      Cookies.remove('user');
      
      // Nu redirecționa dacă suntem deja pe login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
        toast.error('Sesiune expirată. Te rugăm să te autentifici din nou.');
      }
    } else if (error.response?.status === 403) {
      toast.error('Nu ai permisiunea necesară pentru această acțiune.');
    } else if (error.response?.status === 404) {
      // Nu afișa toast pentru 404 în anumite cazuri
      if (!error.config?.url?.includes('/auth/')) {
        toast.error('Resursa solicitată nu a fost găsită.');
      }
    } else if (error.response?.status >= 500) {
      toast.error('Eroare de server. Te rugăm să încerci din nou.');
    }
    
    return Promise.reject(error);
  }
);

export default api;