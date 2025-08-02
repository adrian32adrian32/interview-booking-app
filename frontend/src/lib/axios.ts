import axios from 'axios';
import { toastService } from '@/services/toastService';

// Pentru development local, folosește localhost:5000
// Pentru production, folosește IP-ul serverului fără port (Nginx face proxy pe portul 80)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api';
export const BASE_URL = 'http://94.156.250.138';

console.log('🔧 API URL configured:', API_URL);

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Eliminăm withCredentials pentru a evita probleme CORS
  withCredentials: false,
  // Timeout pentru requests
  timeout: 30000, // 30 secunde
});

// Request interceptor - adaugă token-ul la fiecare request
axiosInstance.interceptors.request.use(
  (config) => {
    // Verificăm dacă suntem în browser
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token added to request');
      }
    }
    
    // Log pentru debugging
    console.log('📤 Request:', config.method?.toUpperCase(), config.url);
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - gestionează erorile
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.response?.status, error.response?.data);
    
    // Gestionăm diferite tipuri de erori
    if (error.response) {
      // Server a răspuns cu un status de eroare
      switch (error.response.status) {
        case 401:
          // Token expirat sau invalid
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirecționăm doar dacă nu suntem deja pe pagina de login
            if (window.location.pathname !== '/login' && 
                window.location.pathname !== '/register') {
              toastService.error('error.unauthorized');
              window.location.href = '/login';
            }
          }
          break;
          
        case 403:
          toastService.error('error.forbidden');
          break;
          
        case 404:
          toastService.error('error.notFound');
          break;
          
        case 500:
          toastService.error('error.server');
          break;
          
        default:
          // Pentru alte erori, afișăm mesajul de la server dacă există
          const message = error.response.data?.message;
          if (message) {
            toastService.error('error.generic', message);
          } else {
            toastService.error('error.generic');
          }
      }
    } else if (error.request) {
      // Request-ul a fost făcut dar nu s-a primit răspuns
      console.error('❌ No response received:', error.request);
      toastService.error('error.network');
    } else {
      // Altă eroare
      console.error('❌ Error:', error.message);
      toastService.error('error.generic');
    }
    
    return Promise.reject(error);
  }
);

// Funcție helper pentru a verifica dacă token-ul există
export const hasToken = (): boolean => {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('token');
  }
  return false;
};

// Funcție helper pentru a seta token-ul
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Funcție helper pentru a șterge token-ul
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

export default axiosInstance;