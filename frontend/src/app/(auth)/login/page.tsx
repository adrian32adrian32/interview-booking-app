'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Email invalid'),
  password: z.string().min(1, 'Parola este obligatorie'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<{type: 'error' | 'success', message: string | React.ReactNode} | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('📧 Starting login with:', data.email);
    
    setLoading(true);
    setLoginMessage(null);
    
    try {
      // Folosim axios în loc de fetch
      const response = await axios.post('/auth/login', {
        email: data.email,
        password: data.password
      });

      console.log('📦 Server response:', response.data);

      if (response.data.success) {
        console.log('✅ Login successful!');
        
        const userData = response.data.user;
        const token = response.data.token;
        
        if (!userData || !token) {
          console.error('❌ Invalid response structure');
          throw new Error('Date invalide de la server');
        }
        
        // Salvăm în localStorage și cookies
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Salvăm și în cookies cu opțiunea remember me
        const cookieOptions = data.rememberMe 
          ? { path: '/', expires: 30 } // 30 zile
          : { path: '/' }; // Session cookie
          
        Cookies.set('token', token, cookieOptions);
        Cookies.set('user', JSON.stringify(userData), cookieOptions);
        
        setLoginMessage({
          type: 'success',
          message: 'Autentificare reușită! Te redirecționăm...'
        });
        
        toast.success('Bine ai revenit!');
        
        // Folosim funcția login din context dacă există
        if (login) {
          await login(data.email, data.password);
        }
        
        // Redirect bazat pe rol
        setTimeout(() => {
          const redirectUrl = userData.role === 'admin' 
            ? '/admin/dashboard' 
            : '/dashboard';
          
          console.log('🔀 Redirecting to:', redirectUrl);
          router.push(redirectUrl);
        }, 1000);
        
      } else {
        console.error('❌ Login failed:', response.data.message);
        setLoginMessage({
          type: 'error',
          message: response.data.message || 'Email sau parolă incorectă!'
        });
      }
    } catch (error: any) {
      console.error('💥 Login error:', error);
      
      const errorMessage = error.response?.data?.message || 'Eroare la conectare. Verifică datele și încearcă din nou.';
      
      setLoginMessage({
        type: 'error',
        message: errorMessage
      });
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Test direct pentru admin - pentru development
  const loginAsAdmin = async () => {
    console.log('🔐 Quick admin login...');
    setLoading(true);
    
    try {
      const response = await axios.post('/auth/login', {
        email: 'admin@interview-app.com',
        password: 'admin123'
      });
      
      if (response.data.success) {
        const userData = response.data.user;
        const token = response.data.token;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        Cookies.set('token', token, { path: '/', expires: 7 });
        Cookies.set('user', JSON.stringify(userData), { path: '/', expires: 7 });
        
        toast.success('Autentificare admin reușită!');
        
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Eroare la autentificare admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-2">
          Bine ai revenit!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
          Intră în cont pentru a continua
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
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
              placeholder="nume@example.com"
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
            Parolă
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
              placeholder="••••••••"
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
              Ține-mă minte
            </span>
          </label>

          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
          >
            Ai uitat parola?
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
              Se încarcă...
            </span>
          ) : (
            <>
              <LogIn className="h-5 w-5 mr-2" />
              Autentifică-te
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
          Nu ai cont?{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
          >
            Înregistrează-te
          </Link>
        </p>
      </div>

      {/* Buton pentru login rapid ca admin - doar în development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <p className="text-xs text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50 text-center mb-2">
            Development Only
          </p>
          <button
            onClick={loginAsAdmin}
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 dark:bg-purple-700 futuristic:bg-gradient-to-r futuristic:from-purple-600 futuristic:to-pink-600 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 futuristic:hover:from-purple-700 futuristic:hover:to-pink-700 disabled:opacity-50 text-sm transition-colors"
          >
            Login Rapid ca Admin (admin@interview-app.com)
          </button>
        </div>
      )}
    </>
  );
}