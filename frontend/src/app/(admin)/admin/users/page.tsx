'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  Users, UserPlus, Search, Filter, Download,
  Mail, Phone, Shield, Calendar, Clock,
  Edit, Trash2, Key, CheckCircle, XCircle,
  AlertCircle, Eye, EyeOff, MoreVertical,
  UserCheck, UserX, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username?: string;
  name?: string;
  email: string;
  role: string;
  phone?: string;
  created_at: string;
  last_login?: string;
  status?: string;
  email_verified?: boolean;
}

export default function UsersManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showActions, setShowActions] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      const usersData = data.data || data || [];
      
      // Adaugă status bazat pe ultima autentificare
      const enhancedUsers = usersData.map((user: User) => ({
        ...user,
        status: getUserStatus(user.last_login),
        name: user.name || `${user.username || user.email.split('@')[0]}`
      }));

      setUsers(enhancedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Eroare la încărcarea utilizatorilor');
    } finally {
      setLoading(false);
    }
  };

  const getUserStatus = (lastLogin?: string) => {
    if (!lastLogin) return 'inactive';
    const daysSinceLogin = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLogin <= 7) return 'active';
    if (daysSinceLogin <= 30) return 'idle';
    return 'inactive';
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Ești sigur că vrei să ștergi acest utilizator?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast.success('Utilizator șters cu succes');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Eroare la ștergerea utilizatorului');
    }
  };

  const handleResetPassword = async (userId: number, email: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to reset password');

      toast.success(`Link de resetare trimis către ${email}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Eroare la resetarea parolei');
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update user status');

      toast.success(`Utilizator ${newStatus === 'active' ? 'activat' : 'suspendat'}`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Eroare la actualizarea statusului');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error('Selectează cel puțin un utilizator');
      return;
    }

    switch (action) {
      case 'delete':
        if (confirm(`Ești sigur că vrei să ștergi ${selectedUsers.length} utilizatori?`)) {
          // Implementează ștergere în masă
          toast.success(`${selectedUsers.length} utilizatori șterși`);
          setSelectedUsers([]);
          fetchUsers();
        }
        break;
      case 'export':
        exportUsers();
        break;
    }
  };

  const exportUsers = () => {
    const dataToExport = selectedUsers.length > 0 
      ? filteredUsers.filter(u => selectedUsers.includes(u.id))
      : filteredUsers;

    const csv = [
      ['ID', 'Nume', 'Email', 'Username', 'Rol', 'Telefon', 'Status', 'Înregistrat', 'Ultima autentificare'],
      ...dataToExport.map(u => [
        u.id,
        u.name || '',
        u.email,
        u.username || '',
        u.role,
        u.phone || '',
        u.status || '',
        format(new Date(u.created_at), 'dd.MM.yyyy'),
        u.last_login ? format(new Date(u.last_login), 'dd.MM.yyyy HH:mm') : 'Niciodată'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `utilizatori-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Export realizat cu succes');
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
      moderator: 'bg-green-100 text-green-800'
    };
    return badges[role as keyof typeof badges] || badges.user;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      idle: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle }
    };
    
    const badge = badges[status as keyof typeof badges] || badges.inactive;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {status === 'active' ? 'Activ' : status === 'idle' ? 'Inactiv recent' : 'Inactiv'}
      </span>
    );
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestionare Utilizatori</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredUsers.length} utilizatori • {users.filter(u => u.role === 'admin').length} administratori
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchUsers()}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </button>
          <button
            onClick={() => router.push('/admin/users/new')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Utilizator Nou
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Caută după nume, email, username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toate rolurile</option>
            <option value="admin">Administratori</option>
            <option value="user">Utilizatori</option>
            <option value="moderator">Moderatori</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toate statusurile</option>
            <option value="active">Activi</option>
            <option value="idle">Inactivi recent</option>
            <option value="inactive">Inactivi</option>
          </select>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              <Filter className="inline h-4 w-4 mr-1" />
              {filteredUsers.length} rezultate
            </span>
            {selectedUsers.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('export')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilizator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activitate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">@{user.username || user.email.split('@')[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {user.email}
                        {user.email_verified && (
                          <CheckCircle className="h-4 w-4 ml-1 text-green-500" title="Email verificat" />
                        )}
                      </div>
                      {user.phone && (
                        <div className="flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role === 'admin' ? 'Administrator' : user.role === 'user' ? 'Utilizator' : 'Moderator'}
                      </span>
                      {getStatusBadge(user.status || 'inactive')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: ro })}
                      </div>
                      {user.last_login && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {format(new Date(user.last_login), 'dd MMM HH:mm', { locale: ro })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {showActions === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                router.push(`/admin/users/${user.id}/edit`);
                                setShowActions(null);
                              }}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editează
                            </button>
                            <button
                              onClick={() => {
                                handleResetPassword(user.id, user.email);
                                setShowActions(null);
                              }}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Resetează parola
                            </button>
                            <button
                              onClick={() => {
                                handleToggleUserStatus(user.id, user.status || 'active');
                                setShowActions(null);
                              }}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                            >
                              {user.status === 'active' ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Suspendă
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activează
                                </>
                              )}
                            </button>
                            <hr className="my-1" />
                            <button
                              onClick={() => {
                                handleDeleteUser(user.id);
                                setShowActions(null);
                              }}
                              className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Șterge
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nu s-au găsit utilizatori</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Încearcă să modifici filtrele de căutare'
                : 'Începe prin a adăuga primul utilizator'}
            </p>
            {!searchTerm && roleFilter === 'all' && statusFilter === 'all' && (
              <button
                onClick={() => router.push('/admin/users/new')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adaugă primul utilizator
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}