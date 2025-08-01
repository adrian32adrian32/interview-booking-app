'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { toastService } from '@/services/toastService';
import api from '@/lib/axios';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<{type: 'error' | 'success', message: string | React.ReactNode} | null>(null);

  // Schema de validare cu traduceri
  const loginSchema = z.object({
    email: z.string().email(t('auth.login.errors.emailInvalid')),
    password: z.string().min(1, t('auth.login.errors.passwordRequired')),
    rememberMe: z.boolean().optional(),
  });

  type LoginFormData = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Funcție de login
  const performLogin = async (email: string, password: string) => {
    console.log('🔐 Starting login for:', email);
    
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      console.log('📥 Login response:', response.data);

      if (response.data.success) {
        const { token, user } = response.data;
        
        // Salvăm în localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Salvăm în cookies
        Cookies.set('token', token, { expires: 7 });
        Cookies.set('user', JSON.stringify(user), { expires: 7 });
        
        // Setăm header-ul pentru axios
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        toastService.success('success.generic', t('success.generic'));
        
        // Redirect bazat pe rol
        setTimeout(() => {
          const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
          console.log('🚀 Redirecting to:', redirectPath);
          router.push(redirectPath);
        }, 1000);
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    console.log('📧 Form submitted with:', data.email);
    
    setLoading(true);
    setLoginMessage(null);
    
    try {
      await performLogin(data.email, data.password);
      
      setLoginMessage({
        type: 'success',
        message: t('auth.login.success')
      });
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          t('auth.login.errors.invalidCredentials');
      
      setLoginMessage({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru login rapid (butoane de test)
  const quickLogin = async (email: string, password: string) => {
    console.log('⚡ Quick login for:', email);
    setLoading(true);
    setLoginMessage(null);
    
    try {
      await performLogin(email, password);
      
      setLoginMessage({
        type: 'success',
        message: t('auth.login.success')
      });
    } catch (error) {
      console.error('Quick login error:', error);
      toastService.error('error.authentication', t('error.authentication'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-2">
          {t('auth.login.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
          {t('auth.login.subtitle')}
        </p>
      </div>

      {loginMessage && (
        <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
          loginMessage.type === 'error' 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800' 
            : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
        }`}>
          {loginMessage.type === 'error' ? (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <div className="text-sm flex-1">{loginMessage.message}</div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
            {t('auth.login.email')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
              placeholder={t('auth.login.emailPlaceholder')}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
            {t('auth.login.password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
              placeholder={t('auth.login.passwordPlaceholder')}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 hover:text-gray-600 dark:hover:text-gray-300 futuristic:hover:text-purple-300"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              {...register('rememberMe')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded"
              defaultChecked
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
              {t('auth.login.rememberMe')}
            </span>
          </label>

          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
          >
            {t('auth.login.forgotPassword')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 futuristic:bg-gradient-to-r futuristic:from-purple-600 futuristic:to-cyan-600 hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:from-purple-700 futuristic:hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('auth.login.signingIn')}
            </span>
          ) : (
            <>
              <LogIn className="h-5 w-5 mr-2" />
              {t('auth.login.signIn')}
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
          {t('auth.login.noAccount')}{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
          >
            {t('auth.login.createAccount')}
          </Link>
        </p>
      </div>
    </>
  );
}

// Forțăm rendering dinamic pentru a evita problemele de pre-rendering
export const dynamic = 'force-dynamic';
