'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

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
  const [loginMessage, setLoginMessage] = useState<{type: 'error' | 'success', message: string} | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('📧 Form data:', data); // DEBUG
    
    setLoading(true);
    setLoginMessage(null);
    
    try {
      console.log('🚀 Calling login function...'); // DEBUG
      const result = await login(data);
      console.log('✅ Login result:', result); // DEBUG
      
      if (result.success) {
        setLoginMessage({
          type: 'success',
          message: 'Autentificare reușită! Te redirecționăm...'
        });
        
        toast.success('Bine ai revenit!');
        
        // Așteaptă puțin pentru a afișa mesajul
        setTimeout(() => {
          const redirectUrl = result.data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
          console.log('🔀 Redirecting to:', redirectUrl); // DEBUG
          router.push(redirectUrl);
        }, 1000);
      } else {
        console.error('❌ Login failed:', result); // DEBUG
        setLoginMessage({
          type: 'error',
          message: result.message || 'Date de autentificare incorecte!'
        });
      }
    } catch (error: any) {
      console.error('💥 Login error:', error); // DEBUG
      console.error('Error response:', error.response); // DEBUG
      
      setLoginMessage({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Email sau parolă incorectă!'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bine ai revenit!
        </h1>
        <p className="text-gray-600">
          Intră în cont pentru a continua
        </p>
      </div>

      {loginMessage && (
        <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
          loginMessage.type === 'error' 
            ? 'bg-red-50 text-red-800 border border-red-200' 
            : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          {loginMessage.type === 'error' ? (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p className="text-sm">{loginMessage.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="nume@example.com"
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Parolă
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              {...register('rememberMe')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">
              Ține-mă minte
            </span>
          </label>

          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Ai uitat parola?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <p className="text-sm text-gray-600">
          Nu ai cont?{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            Înregistrează-te
          </Link>
        </p>
      </div>

      {/* DEBUG - Test direct API */}
      <div className="mt-8 text-center">
        <button
          onClick={async () => {
            console.log('🧪 Testing direct API call...');
            try {
              const response = await fetch('http://94.156.250.138/api/auth/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: 'admin@example.com',
                  password: 'admin123'
                })
              });
              const data = await response.json();
              console.log('🧪 Direct API response:', data);
            } catch (error) {
              console.error('🧪 Direct API error:', error);
            }
          }}
          className="text-xs text-gray-500 underline"
        >
          Test Direct API
        </button>
      </div>
    </>
  );
}