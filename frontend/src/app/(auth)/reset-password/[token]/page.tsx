'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(true);

  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && password !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast.error('Parola nu îndeplinește toate cerințele');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Parolele nu coincid');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`/auth/reset-password/${params.token}`, {
        password
      });
      
      if (response.data.success) {
        toast.success('Parola a fost resetată cu succes!');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        setValidToken(false);
        toast.error('Link-ul de resetare este invalid sau a expirat');
      } else {
        toast.error(error.response?.data?.message || 'Eroare la resetarea parolei');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 futuristic:from-purple-900 futuristic:to-black p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 futuristic:bg-purple-900/50 backdrop-blur-lg rounded-2xl shadow-xl dark:shadow-gray-900/50 futuristic:shadow-purple-500/20 p-8 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 futuristic:bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-red-600 dark:text-red-400 futuristic:text-red-300" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-2">
              Link invalid
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70 mb-6">
              Acest link de resetare a parolei este invalid sau a expirat. 
              Te rugăm să soliciți un nou link.
            </p>

            <div className="space-y-3">
              <Link
                href="/forgot-password"
                className="block w-full bg-blue-600 dark:bg-blue-700 futuristic:bg-gradient-to-r futuristic:from-purple-600 futuristic:to-cyan-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:from-purple-700 futuristic:hover:to-cyan-700 transition-colors text-center"
              >
                Solicită link nou
              </Link>
              
              <Link
                href="/login"
                className="block w-full text-center text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70 hover:text-gray-900 dark:hover:text-gray-200 futuristic:hover:text-cyan-100"
              >
                Înapoi la login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 futuristic:from-purple-900 futuristic:to-black p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/50 backdrop-blur-lg rounded-2xl shadow-xl dark:shadow-gray-900/50 futuristic:shadow-purple-500/20 p-8 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
              Parolă Nouă
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
              Introdu noua ta parolă
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2"
              >
                Parola nouă
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 futuristic:placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent bg-white dark:bg-gray-700 futuristic:bg-purple-800/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2"
              >
                Confirmă parola
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 futuristic:placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent bg-white dark:bg-gray-700 futuristic:bg-purple-800/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-700/50 futuristic:bg-purple-800/20 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
                Cerințe parolă:
              </p>
              <div className="space-y-1">
                {Object.entries({
                  'Minim 8 caractere': passwordRequirements.length,
                  'O literă mare': passwordRequirements.uppercase,
                  'O literă mică': passwordRequirements.lowercase,
                  'Un număr': passwordRequirements.number,
                  'Un caracter special (!@#$%^&*)': passwordRequirements.special,
                }).map(([requirement, met]) => (
                  <div key={requirement} className="flex items-center text-sm">
                    {met ? (
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                    )}
                    <span className={met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                      {requirement}
                    </span>
                  </div>
                ))}
                {confirmPassword && (
                  <div className="flex items-center text-sm">
                    {passwordsMatch ? (
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                    ) : (
                      <X className="w-4 h-4 text-red-500 mr-2" />
                    )}
                    <span className={passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      Parolele coincid
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 futuristic:bg-gradient-to-r futuristic:from-purple-600 futuristic:to-cyan-600 hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:from-purple-700 futuristic:hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Resetez parola...
                </>
              ) : (
                'Resetează parola'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-500 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
            >
              Înapoi la login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}