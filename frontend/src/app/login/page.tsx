'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Salvează token în localStorage
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Salvează token și în cookie pentru middleware
        document.cookie = `token=${data.data.token}; path=/; max-age=604800; SameSite=Lax`;
        
        // Redirect based on role
        if (data.data.user.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.message || 'Eroare la autentificare');
      }
    } catch {
      setError('Eroare de conexiune. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
            Autentificare
          </h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="emailOrUsername">
                Email sau Username
              </label>
              <input
                id="emailOrUsername"
                type="text"
                value={formData.emailOrUsername}
                onChange={(e) => setFormData({...formData, emailOrUsername: e.target.value})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="email@example.com sau username"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Parolă
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="********"
                required
              />
            </div>

            <div className="flex items-center justify-between mb-6">
              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                  loading 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? 'Se încarcă...' : 'Autentificare'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-gray-600">
                Nu ai cont?{' '}
                <Link href="/register" className="text-blue-500 hover:text-blue-800 font-semibold">
                  Înregistrează-te
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}