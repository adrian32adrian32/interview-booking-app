'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Mail, Phone, Shield, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'user'
  });

  // Detectează tema curentă
  useEffect(() => {
    const detectTheme = () => {
      const savedTheme = localStorage.getItem('theme') || 'light';
      setTheme(savedTheme);
    };

    detectTheme();

    // Ascultă pentru schimbări de temă
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        detectTheme();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Funcție pentru a obține clasele input-ului bazat pe temă
  const getInputClasses = () => {
    const baseClasses = "w-full px-3 py-2 rounded-lg focus:ring-2 transition-all duration-300";

    if (theme === 'futuristic') {
      return `${baseClasses} bg-gray-900/50 backdrop-blur-sm border border-purple-500/30 text-purple-100 placeholder-purple-400/50 focus:ring-purple-500 focus:border-purple-400 hover:border-purple-400/50`;
    } else if (theme === 'dark') {
      return `${baseClasses} bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 focus:ring-blue-400 focus:border-blue-400`;
    } else {
      return `${baseClasses} bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500`;
    }
  };

  // Funcție pentru clasele label
  const getLabelClasses = () => {
    if (theme === 'futuristic') {
      return "block text-sm font-medium text-purple-300 mb-2";
    } else if (theme === 'dark') {
      return "block text-sm font-medium text-gray-300 mb-2";
    } else {
      return "block text-sm font-medium text-gray-700 mb-2";
    }
  };

  // Funcție pentru clasele select
  const getSelectClasses = () => {
    const baseClasses = "w-full px-3 py-2 rounded-lg focus:ring-2 transition-all duration-300";

    if (theme === 'futuristic') {
      return `${baseClasses} bg-gray-900/50 backdrop-blur-sm border border-purple-500/30 text-purple-100 focus:ring-purple-500 focus:border-purple-400 hover:border-purple-400/50 [&>option]:bg-gray-900 [&>option]:text-purple-100`;
    } else if (theme === 'dark') {
      return `${baseClasses} bg-gray-700 border border-gray-600 text-gray-100 focus:ring-blue-400 focus:border-blue-400 [&>option]:bg-gray-700`;
    } else {
      return `${baseClasses} bg-white border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500`;
    }
  };

  // Funcție pentru clasele containerului principal
  const getContainerClasses = () => {
    if (theme === 'futuristic') {
      return "bg-gray-900/70 backdrop-blur-md rounded-lg shadow-2xl shadow-purple-500/20 p-6 border border-purple-500/30";
    } else if (theme === 'dark') {
      return "bg-gray-800 rounded-lg shadow-gray-700/50 p-6 border border-gray-700";
    } else {
      return "bg-white rounded-lg shadow-sm p-6 border border-gray-200";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validare parolă
    if (formData.password !== formData.confirmPassword) {
      toast.error('Parolele nu coincid');
      return;
    }

    // Validare lungime parolă
    if (formData.password.length < 6) {
      toast.error('Parola trebuie să aibă minim 6 caractere');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138:5000/api';
      
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username || undefined,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || undefined,
          role: formData.role
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      toast.success('Utilizator creat cu succes!');
      router.push('/admin/users');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Eroare la crearea utilizatorului');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className={`flex items-center transition-colors ${
            theme === 'futuristic'
              ? 'text-purple-400 hover:text-purple-300'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-gray-100'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi
        </button>
      </div>

      <div className={getContainerClasses()}>
        <h1 className={`text-2xl font-bold mb-6 ${
          theme === 'futuristic' ? 'text-purple-200' : theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
        }`}>
          Adaugă Utilizator Nou
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={getLabelClasses()} htmlFor="firstName">
                <User className="inline h-4 w-4 mr-1" />
                Prenume
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={getInputClasses()}
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className={getLabelClasses()} htmlFor="lastName">
                <User className="inline h-4 w-4 mr-1" />
                Nume
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={getInputClasses()}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className={getLabelClasses()} htmlFor="email">
              <Mail className="inline h-4 w-4 mr-1" />
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={getInputClasses()}
              autoComplete="email"
            />
          </div>

          <div>
            <label className={getLabelClasses()} htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={getInputClasses()}
              placeholder="Opțional"
              autoComplete="username"
            />
          </div>

          <div>
            <label className={getLabelClasses()} htmlFor="phone">
              <Phone className="inline h-4 w-4 mr-1" />
              Telefon
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={getInputClasses()}
              placeholder="Opțional"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className={getLabelClasses()} htmlFor="role">
              <Shield className="inline h-4 w-4 mr-1" />
              Rol
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={getSelectClasses()}
            >
              <option value="user">Utilizator</option>
              <option value="admin">Administrator</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={getLabelClasses()} htmlFor="password">
                <Key className="inline h-4 w-4 mr-1" />
                Parolă
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={getInputClasses()}
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className={getLabelClasses()} htmlFor="confirmPassword">
                <Key className="inline h-4 w-4 mr-1" />
                Confirmă Parola
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={getInputClasses()}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className={`flex justify-end gap-3 pt-6 border-t ${
            theme === 'futuristic' 
              ? 'border-purple-500/30' 
              : theme === 'dark' 
              ? 'border-gray-700' 
              : 'border-gray-200'
          }`}>
            <button
              type="button"
              onClick={() => router.back()}
              className={`px-4 py-2 rounded-lg transition-all ${
                theme === 'futuristic'
                  ? 'border border-purple-500/30 hover:bg-purple-800/20 text-purple-300'
                  : theme === 'dark'
                  ? 'border border-gray-600 hover:bg-gray-700 text-gray-300'
                  : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-all ${
                theme === 'futuristic'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25'
                  : theme === 'dark'
                  ? 'bg-blue-700 hover:bg-blue-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}