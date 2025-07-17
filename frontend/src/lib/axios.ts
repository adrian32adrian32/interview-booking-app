import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Creează instanță axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor pentru a adăuga token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor pentru error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirat sau invalid
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/login';
      toast.error('Sesiune expirată. Te rugăm să te autentifici din nou.');
    } else if (error.response?.status === 403) {
      toast.error('Nu ai permisiunea necesară pentru această acțiune.');
    } else if (error.response?.status === 500) {
      toast.error('Eroare server. Te rugăm să încerci din nou.');
    }
    
    return Promise.reject(error);
  }
);

export default api;