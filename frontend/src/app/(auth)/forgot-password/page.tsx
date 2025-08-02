'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/axios';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<{type: 'error' | 'success' | 'info', text: string} | null>(null);

  // Schema de validare cu traduceri
  const forgotPasswordSchema = z.object({
    email: z.string().email(t('auth.forgotPassword.errors.emailInvalid')),
  });

  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/auth/forgot-password', data);
      
      if (response.data.success) {
        setSubmitted(true);
        setMessage({
          type: 'success',
          text: t('auth.forgotPassword.successMessage')
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message;
      
      // Verifică dacă e eroare specifică de email negăsit
      if (error.response?.status === 404 || errorMessage?.includes('nu există') || errorMessage?.includes('negăsit') || errorMessage?.includes('not found')) {
        setMessage({
          type: 'error',
          text: t('auth.forgotPassword.errors.emailNotFound')
        });
      } else {
        setMessage({
          type: 'error',
          text: t('auth.forgotPassword.errors.genericError')
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted && message?.type === 'success') {
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-4">
          {t('auth.forgotPassword.successTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70 mb-8">
          {t('auth.forgotPassword.successMessage')}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('auth.forgotPassword.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-2">
          {t('auth.forgotPassword.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
          {t('auth.forgotPassword.subtitle')}
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start space-x-2 ${
          message.type === 'error' 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800' 
            : message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
        }`}>
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
            {t('auth.forgotPassword.emailLabel')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
              placeholder={t('auth.forgotPassword.emailPlaceholder')}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
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
              {t('auth.forgotPassword.submitting')}
            </span>
          ) : (
            t('auth.forgotPassword.submit')
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('auth.forgotPassword.backToLogin')}
        </Link>
      </div>
    </>
  );
}

// Force dynamic rendering to avoid pre-rendering issues with auth
export const dynamic = 'force-dynamic';
