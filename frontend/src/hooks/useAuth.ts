import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const userCookie = Cookies.get('user');
    const token = Cookies.get('token');

    if (userCookie && token) {
      try {
        const user = JSON.parse(userCookie);
        setAuthState({
          user,
          loading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('Error parsing user cookie:', error);
        logout();
      }
    } else {
      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        rememberMe,
      });

      const { user, accessToken, refreshToken } = response.data.data;

      // Salvează în cookies
      Cookies.set('token', accessToken, { 
        expires: rememberMe ? 7 : 1 
      });
      Cookies.set('user', JSON.stringify(user), { 
        expires: rememberMe ? 7 : 1 
      });

      if (refreshToken && rememberMe) {
        Cookies.set('refreshToken', refreshToken, { expires: 7 });
      }

      setAuthState({
        user,
        loading: false,
        isAuthenticated: true,
      });

      toast.success('Autentificare reușită!');

      // Redirect based on role
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Eroare la autentificare';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      const response = await api.post('/auth/register', data);

      toast.success('Cont creat cu succes! Verifică-ți email-ul.');
      router.push('/login');

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Eroare la înregistrare';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Șterge cookies
      Cookies.remove('token');
      Cookies.remove('user');
      Cookies.remove('refreshToken');

      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false,
      });

      router.push('/login');
      toast.success('Ai fost deconectat!');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Verifică-ți email-ul pentru instrucțiuni de resetare.');
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Eroare la trimiterea email-ului';
      toast.error(message);
      return { success: false, message };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });

      const { user, accessToken } = response.data.data;

      // Auto-login după resetare
      Cookies.set('token', accessToken, { expires: 1 });
      Cookies.set('user', JSON.stringify(user), { expires: 1 });

      setAuthState({
        user,
        loading: false,
        isAuthenticated: true,
      });

      toast.success('Parolă resetată cu succes!');
      router.push('/dashboard');

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Eroare la resetarea parolei';
      toast.error(message);
      return { success: false, message };
    }
  };

  return {
    ...authState,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    checkAuth,
  };
};