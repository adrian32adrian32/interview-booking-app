'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/axios';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalid'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<{type: 'error' | 'success' | 'info', text: string} | null>(null);

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
          text: 'Instrucțiunile pentru resetarea parolei au fost trimise pe email!'
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message;
      
      // Verifică dacă e eroare specifică de email negăsit
      if (error.response?.status === 404 || errorMessage?.includes('nu există') || errorMessage?.includes('negăsit')) {
        setMessage({
          type: 'error',
          text: 'Nu există niciun cont înregistrat cu această adresă de email!'
        });
      } else {
        setMessage({
          type: 'error',
          text: errorMessage || 'A apărut o eroare. Te rugăm să încerci din nou.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted && message?.type === 'success') {
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Email trimis!
        </h2>
        <p className="text-gray-600 mb-8">
          Verifică-ți inbox-ul pentru instrucțiunile de resetare a parolei.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi la autentificare
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Ai uitat parola?
        </h1>
        <p className="text-gray-600">
          Introdu adresa de email și îți vom trimite instrucțiuni pentru resetare
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start space-x-2 ${
          message.type === 'error' 
            ? 'bg-red-50 text-red-800 border border-red-200' 
            : message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Adresă email
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
              Se trimite...
            </span>
          ) : (
            'Trimite instrucțiuni'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi la autentificare
        </Link>
      </div>
    </>
  );
}