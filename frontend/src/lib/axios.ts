import axios from 'axios';
import toast from 'react-hot-toast';

// Pentru development local, folosește localhost:5000
// Pentru production, folosește IP-ul serverului fără port (Nginx face proxy pe portul 80)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api';

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
              toast.error('Sesiune expirată. Te rugăm să te autentifici din nou.');
              window.location.href = '/login';
            }
          }
          break;
          
        case 403:
          toast.error('Nu ai permisiunea să accesezi această resursă.');
          break;
          
        case 404:
          toast.error('Resursa solicitată nu a fost găsită.');
          break;
          
        case 500:
          toast.error('Eroare server. Te rugăm să încerci din nou.');
          break;
          
        default:
          // Pentru alte erori, afișăm mesajul de la server dacă există
          const message = error.response.data?.message || 'A apărut o eroare. Te rugăm să încerci din nou.';
          toast.error(message);
      }
    } else if (error.request) {
      // Request-ul a fost făcut dar nu s-a primit răspuns
      console.error('❌ No response received:', error.request);
      toast.error('Nu s-a putut conecta la server. Verifică conexiunea la internet.');
    } else {
      // Altă eroare
      console.error('❌ Error:', error.message);
      toast.error('A apărut o eroare neașteptată.');
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