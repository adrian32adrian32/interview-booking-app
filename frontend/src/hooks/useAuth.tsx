'use client';

import Cookies from 'js-cookie';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios'; // Folosim instanța configurată
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  username?: string;
  name?: string;
  role: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  email_verified?: boolean;
  emailVerified?: boolean;
  is_active?: boolean;
  avatar?: string;
  phone?: string;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<LoginResponse>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    token: string;
    accessToken?: string;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Normalize user data
  const normalizeUser = (userData: any): User => {
    return {
      ...userData,
      // Normalize name fields
      first_name: userData.first_name || userData.firstName,
      last_name: userData.last_name || userData.lastName,
      firstName: userData.firstName || userData.first_name,
      lastName: userData.lastName || userData.last_name,
      // Normalize email verified
      email_verified: userData.email_verified || userData.emailVerified,
      emailVerified: userData.emailVerified || userData.email_verified,
      // Ensure we have a display name
      name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username || userData.email
    };
  };

  // Verifică dacă utilizatorul este autentificat
  const checkAuth = async () => {
    try {
      // Verifică dacă suntem pe client-side
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token') || Cookies.get('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Folosim instanța api care are deja baseURL configurat
      const response = await api.get('/auth/me');

      if (response.data.success) {
        const userData = normalizeUser(response.data.user || response.data.data);
        setUser(userData);
      } else {
        // Curăță datele de autentificare
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        Cookies.remove('token');
        Cookies.remove('user');
        setUser(null);
      }
    } catch (error: any) {
      // Nu afișa eroarea în consolă pentru 401 (utilizator neautentificat)
      if (error.response?.status !== 401 && error.response?.status !== 404) {
        console.error('Auth check error:', error);
      }
      
      // Pentru 401 sau alte erori, curăță autentificarea
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        Cookies.remove('token');
        Cookies.remove('user');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token') || Cookies.get('token');
      
      if (!token) {
        return;
      }

      const response = await api.get('/auth/me');

      if (response.data.success) {
        const userData = normalizeUser(response.data.user || response.data.data);
        setUser(userData);
        
        // Update localStorage and cookies
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        Cookies.set('user', JSON.stringify(userData));
      }
    } catch (error: any) {
      console.error('Error refreshing user:', error);
      // Don't logout on refresh error, just log it
    }
  };

  useEffect(() => {
    // Verifică doar pe client-side
    if (typeof window !== 'undefined') {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  // Login
  const login = async (data: LoginData): Promise<LoginResponse> => {
    try {
      console.log('🔐 Sending login request...');
      
      // Folosim instanța api configurată
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password
      });

      console.log('📦 Login API response:', response.data);

      if (response.data.success) {
        // Extragem datele din răspuns
        const userData = normalizeUser(response.data.user);
        const token = response.data.token;
        
        console.log('👤 User data:', userData);
        console.log('🎫 Token:', token ? 'exists' : 'missing');
        
        // Salvează token și user în localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        // Salvează și în cookies pentru middleware
        const cookieOptions = data.rememberMe ? { expires: 7 } : undefined; // 7 zile dacă remember me
        Cookies.set('token', token, cookieOptions);
        Cookies.set('user', JSON.stringify(userData), cookieOptions);
        
        console.log('🍪 Cookies set:', {
          token: Cookies.get('token') ? 'set' : 'not set',
          user: Cookies.get('user') ? 'set' : 'not set'
        });
        
        // Setează user în state
        setUser(userData);
        
        // Afișează mesaj de succes
        toast.success('Autentificare reușită!');
        
        // Returnează structura pentru pagina de login
        return {
          success: true,
          data: {
            user: userData,
            token: token
          }
        };
      }
      
      return {
        success: false,
        message: response.data.message || 'Autentificare eșuată'
      };
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('Error response:', error.response?.data);
      
      // Afișează mesaj de eroare
      const errorMessage = error.response?.data?.message || 'Eroare la autentificare';
      toast.error(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Apelează endpoint-ul de logout (opțional)
      await api.post('/auth/logout').catch(() => {
        // Ignoră eroarea dacă endpoint-ul nu există
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Șterge din localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    // Șterge și din cookies
    Cookies.remove('token');
    Cookies.remove('user');
    
    // Reset state
    setUser(null);
    
    // Redirect
    router.push('/login');
    toast.success('Ai fost deconectat cu succes!');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth, refreshUser }}>
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