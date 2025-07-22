'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: 'admin' | 'user';
  avatar_url?: string;
  notification_preferences?: any;
  email_verified?: boolean;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Computed property pentru isAdmin
  const isAdmin = user?.role === 'admin';

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token') || Cookies.get('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const userData = response.data.user || response.data.data;
        setUser(userData);
        
        // Actualizăm și în localStorage pentru consistență
        localStorage.setItem('user', JSON.stringify(userData));
        Cookies.set('user', JSON.stringify(userData), { expires: 7 });
      } else {
        clearAuth();
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearAuth();
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token') || Cookies.get('token');
      if (!token) {
        console.error('No token found for refresh');
        return;
      }

      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const userData = response.data.user || response.data.data;
        setUser(userData);
        
        // Actualizăm și în localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        Cookies.set('user', JSON.stringify(userData), { expires: 7 });
      }
    } catch (error: any) {
      console.error('Error refreshing user:', error);
      if (error.response?.status === 401) {
        clearAuth();
        router.push('/login');
      }
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    Cookies.remove('token');
    Cookies.remove('user');
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const userData = response.data.user;
        const token = response.data.token;
        
        // Salvăm token-ul
        localStorage.setItem('token', token);
        Cookies.set('token', token, { expires: 7 });
        
        // Salvăm user data
        localStorage.setItem('user', JSON.stringify(userData));
        Cookies.set('user', JSON.stringify(userData), { expires: 7 });
        
        // Setăm user în state
        setUser(userData);
        
        // Configurăm axios cu noul token
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        toast.success('Autentificare reușită!');
        
        // Redirect bazat pe rol
        if (userData.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Eroare la autentificare';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Încercăm să facem logout pe server
      await api.post('/auth/logout').catch(() => {
        // Ignorăm eroarea dacă serverul nu răspunde
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Curățăm local storage și cookies
    clearAuth();
    
    // Resetăm axios headers
    delete api.defaults.headers.common['Authorization'];
    
    // Redirect și notificare
    router.push('/login');
    toast.success('Ai fost deconectat cu succes!');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      checkAuth,
      refreshUser,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};