'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Shield
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Key } from 'lucide-react';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  email_verified: boolean;
  created_at: string;
  bookings_count?: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Eroare la încărcarea utilizatorilor');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: number, newStatus: string) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success('Status actualizat cu succes!');
      loadUsers();
    } catch (error) {
      toast.error('Eroare la actualizarea statusului');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('Rol actualizat cu succes!');
      loadUsers();
    } catch (error) {
      toast.error('Eroare la actualizarea rolului');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Ești sigur că vrei să ștergi acest utilizator?')) {
      return;
    }
// Adaugă această funcție după handleDelete
const handleResetPassword = async (userId: number, userEmail: string) => {
  const newPassword = prompt(`Introdu noua parolă pentru ${userEmail}:`);
  
  if (!newPassword || newPassword.length < 8) {
    toast.error('Parola trebuie să aibă minim 8 caractere!');
    return;
  }

  try {
    await api.post(`/admin/users/${userId}/reset-password`, { 
      newPassword 
    });
    toast.success('Parolă resetată cu succes!');
  } catch (error) {
    toast.error('Eroare la resetarea parolei');
  }
};

// În tabel, adaugă un buton nou:
<button
  onClick={() => handleResetPassword(user.id, user.email)}
  className="text-yellow-600 hover:text-yellow-800"
  title="Resetează parola"
>
  <Key className="h-5 w-5" />
</button>
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Utilizator șters cu succes!');
      loadUsers();
    } catch (error) {
      toast.error('Eroare la ștergerea utilizatorului');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Gestionare Utilizatori
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Total: {users.length} utilizatori înregistrați
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Caută utilizatori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toate rolurile</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toate statusurile</option>
            <option value="active">Activ</option>
            <option value="inactive">Inactiv</option>
            <option value="suspended">Suspendat</option>
          </select>

          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm">
            <div>
              <span className="text-gray-500">Admini:</span>
              <span className="ml-1 font-medium">{users.filter(u => u.role === 'admin').length}</span>
            </div>
            <div>
              <span className="text-gray-500">Activi:</span>
              <span className="ml-1 font-medium">{users.filter(u => u.status === 'active').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilizator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Înregistrat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      {user.bookings_count !== undefined && (
                        <div className="text-xs text-gray-500">
                          {user.bookings_count} programări
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">{user.email}</span>
                    {user.email_verified && (
                      <UserCheck className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className={`text-sm px-2 py-1 rounded-full border-0 ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.status}
                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                    className={`text-sm px-2 py-1 rounded-full border-0 ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : user.status === 'suspended'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <option value="active">Activ</option>
                    <option value="inactive">Inactiv</option>
                    <option value="suspended">Suspendat</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(user.created_at), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.location.href = `mailto:${user.email}`}
                      className="text-gray-400 hover:text-gray-600"
                      title="Trimite email"
                    >
                      <Mail className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-400 hover:text-red-600"
                      title="Șterge utilizator"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nu s-au găsit utilizatori
          </div>
        )}
      </div>
    </div>
  );
}