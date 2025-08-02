'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { toastService } from '@/services/toastService';
import { User, Mail, Phone, Calendar, Edit, Trash2, Power, PowerOff, FileText, Briefcase } from 'lucide-react';

interface UserData {
  id: number;
  username: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string;
  bookings_count?: number;
  documents_count?: number;
}

export default function UsersList() {
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toastService.error('error.loadingUsers');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await axios.patch(`/users/${userId}/status`, { status: newStatus });
      toastService.success('success.generic', `Utilizator ${newStatus === 'active' ? 'activat' : 'dezactivat'}`);
      fetchUsers();
    } catch (error) {
      toastService.error('error.updateStatus');
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Sigur doriți să ștergeți utilizatorul ${username}?`)) {
      return;
    }

    try {
      await axios.delete(`/users/${userId}`);
      toastService.success('success.generic', 'Utilizator șters cu succes');
      fetchUsers();
    } catch (error: any) {
      if (error.response?.data?.message) {
        toastService.error('error.generic', error.response.data.message);
      } else {
        toastService.error('error.deleteUser');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    if (filter === 'active') return user.status === 'active';
    if (filter === 'inactive') return user.status === 'inactive';
    return user.role === filter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Utilizatori ({filteredUsers.length})</h2>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border-gray-300"
            >
              <option value="all">Toți</option>
              <option value="active">{t('components.activi')}</option>
              <option value="inactive">{t('components.inactivi')}</option>
              <option value="admin">{t('components.admini')}</option>
              <option value="user">{t('components.utilizatori')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilizator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Programări
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || user.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-gray-400" />
                    {user.email}
                  </div>
                  {user.phone && (
                    <div className="text-sm text-gray-500 flex items-center">
                      <Phone className="h-4 w-4 mr-1 text-gray-400" />
                      {user.phone}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrator' : 'Utilizator'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status === 'active' ? 'Activ' : 'Inactiv'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="flex items-center text-gray-900">
                      <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{user.bookings_count || 0} programări</span>
                    </div>
                    {user.documents_count > 0 && (
                      <div className="flex items-center text-blue-600 mt-1">
                        <FileText className="h-4 w-4 mr-1" />
                        <span>{user.documents_count} documente</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Editează"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/admin/users/${user.id}/documents`)}
                      className="text-green-600 hover:text-green-900"
                      title={t('components.documente')}
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleUserStatus(user.id, user.status)}
                      className={user.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                      title={user.status === 'active' ? 'Dezactivează' : 'Activează'}
                    >
                      {user.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        className="text-red-600 hover:text-red-900"
                        title="Șterge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}