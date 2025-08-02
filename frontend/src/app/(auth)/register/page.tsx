'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Schema de validare cu traduceri
  const registerSchema = z.object({
    firstName: z.string()
      .min(2, t('auth.register.errors.firstNameMin'))
      .max(50, t('auth.register.errors.firstNameMax'))
      .regex(/^[a-zA-ZăâîșțĂÂÎȘȚ\s-]+$/, t('auth.register.errors.firstNameInvalid')),
    lastName: z.string()
      .min(2, t('auth.register.errors.lastNameMin'))
      .max(50, t('auth.register.errors.lastNameMax'))
      .regex(/^[a-zA-ZăâîșțĂÂÎȘȚ\s-]+$/, t('auth.register.errors.lastNameInvalid')),
    email: z.string().email(t('auth.register.errors.emailInvalid')),
    password: z.string()
      .min(8, t('auth.register.errors.passwordMin'))
      .regex(/^(?=.*[A-Z])(?=.*\d)/, t('auth.register.errors.passwordInvalid')),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.register.errors.passwordMismatch'),
    path: ["confirmPassword"],
  });

  type RegisterFormData = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const result = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      
      if (!result.success) {
        // Error handled by useAuth hook
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-2">
          {t('auth.register.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
          {t('auth.register.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
              {t('auth.register.firstName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
              <input
                {...register('firstName')}
                type="text"
                id="firstName"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
                placeholder={t('auth.register.firstNamePlaceholder')}
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
              {t('auth.register.lastName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
              <input
                {...register('lastName')}
                type="text"
                id="lastName"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
                placeholder={t('auth.register.lastNamePlaceholder')}
              />
            </div>
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
            {t('auth.register.email')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
              placeholder={t('auth.register.emailPlaceholder')}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
            {t('auth.register.password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
              placeholder={t('auth.register.passwordPlaceholder')}
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
            {t('auth.register.passwordHint')}
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
            {t('auth.register.confirmPassword')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 h-5 w-5" />
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent transition-colors"
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 hover:text-gray-600 dark:hover:text-gray-300 futuristic:hover:text-purple-300"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
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
              {t('auth.register.submitting')}
            </span>
          ) : (
            <>
              <UserPlus className="h-5 w-5 mr-2" />
              {t('auth.register.submit')}
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
          {t('auth.register.haveAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
          >
            {t('auth.register.signIn')}
          </Link>
        </p>
      </div>
    </>
  );
}

// Force dynamic rendering to avoid pre-rendering issues with auth
export const dynamic = 'force-dynamic';
