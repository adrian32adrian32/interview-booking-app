'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Mail, Phone, Shield, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Parolele nu coincid');
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
          username: formData.username,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: formData.role
        })
      });

      if (!response.ok) throw new Error('Failed to create user');

      toast.success('Utilizator creat cu succes!');
      router.push('/admin/users');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Eroare la crearea utilizatorului');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 dark:text-gray-400 futuristic:text-cyan-400 hover:text-gray-900 dark:hover:text-gray-100 futuristic:hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-6">Adaugă Utilizator Nou</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Prenume
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Nume
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-400 dark:placeholder-gray-500 futuristic:placeholder-cyan-300/50"
              placeholder="Opțional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              Telefon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-400 dark:placeholder-gray-500 futuristic:placeholder-cyan-300/50"
              placeholder="Opțional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
              <Shield className="inline h-4 w-4 mr-1" />
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
            >
              <option value="user">Utilizator</option>
              <option value="admin">Administrator</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
                <Key className="inline h-4 w-4 mr-1" />
                Parolă
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
                <Key className="inline h-4 w-4 mr-1" />
                Confirmă Parola
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-700 futuristic:border-purple-500/30">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/20 text-gray-700 dark:text-gray-300 futuristic:text-cyan-200"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 disabled:opacity-50"
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