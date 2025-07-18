'use client';

import Cookies from 'js-cookie';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  username?: string;
  role: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<LoginResponse>;
  logout: () => void;
  checkAuth: () => Promise<void>;
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138:5000';

  // Verifică dacă utilizatorul este autentificat
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token') || Cookies.get('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        Cookies.remove('token');
        Cookies.remove('user');
      }
    } catch (error: any) {
      // Nu afișa eroarea în consolă pentru 401 (utilizator neautentificat)
      if (error.response?.status !== 401) {
        console.error('Auth check error:', error);
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      Cookies.remove('token');
      Cookies.remove('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Login
  const login = async (data: LoginData): Promise<LoginResponse> => {
    try {
      // IMPORTANT: Folosim endpoint-ul corect din GitHub
      console.log('🔐 Sending login request to:', `${API_URL}/api/auth/login-no-validation`);
      
      const response = await axios.post(`${API_URL}/api/auth/login-no-validation`, {
        email: data.email,
        password: data.password
      });

      console.log('📦 Login API response:', response.data);

      if (response.data.success) {
        // Extragem datele din răspuns - structura exactă
        const userData = response.data.data.user;
        const token = response.data.data.accessToken;
        
        console.log('👤 User data:', userData);
        console.log('🎫 Token:', token ? 'exists' : 'missing');
        
        // Salvează token și user în localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // IMPORTANT: Salvează și în cookies pentru middleware
        const cookieOptions = data.rememberMe ? { expires: 7 } : undefined; // 7 zile dacă remember me
        Cookies.set('token', token, cookieOptions);
        Cookies.set('user', JSON.stringify(userData), cookieOptions);
        
        console.log('🍪 Cookies set:', {
          token: Cookies.get('token') ? 'set' : 'not set',
          user: Cookies.get('user') ? 'set' : 'not set'
        });
        
        // Setează user în state
        setUser(userData);
        
        // Configurează axios pentru cererile viitoare
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Returnează structura corectă pentru pagina de login
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
      
      // Dacă endpoint-ul no-validation nu merge, încearcă cel normal
      if (error.response?.status === 404) {
        console.log('🔄 Trying standard login endpoint...');
        
        try {
          const fallbackResponse = await axios.post(`${API_URL}/api/auth/login`, {
            email: data.email,
            password: data.password
          });
          
          if (fallbackResponse.data.success) {
            const responseData = fallbackResponse.data.data;
            const userData = responseData.user;
            const token = responseData.accessToken || responseData.token;
            
            // Salvează datele
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            
            const cookieOptions = data.rememberMe ? { expires: 7 } : undefined;
            Cookies.set('token', token, cookieOptions);
            Cookies.set('user', JSON.stringify(userData), cookieOptions);
            
            setUser(userData);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            return {
              success: true,
              data: {
                user: userData,
                token: token
              }
            };
          }
        } catch (fallbackError: any) {
          console.error('❌ Fallback login error:', fallbackError);
        }
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Eroare la autentificare'
      };
    }
  };

  // Logout
  const logout = () => {
    // Șterge din localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Șterge și din cookies
    Cookies.remove('token');
    Cookies.remove('user');
    
    // Șterge din axios headers
    delete axios.defaults.headers.common['Authorization'];
    
    // Reset state
    setUser(null);
    
    // Redirect
    router.push('/login');
    toast.success('Ai fost deconectat cu succes!');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
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