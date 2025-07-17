'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  UserPlus,
  CalendarPlus,
  Eye
} from 'lucide-react';
import api from '@/lib/axios';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalBookings: number;
  todayBookings: number;
  totalSlots: number;
  availableSlots: number;
  recentUsers: any[];
  recentBookings: any[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalBookings: 0,
    todayBookings: 0,
    totalSlots: 0,
    availableSlots: 0,
    recentUsers: [],
    recentBookings: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Încarcă toate datele în paralel cu gestionare individuală a erorilor
      const [statsResponse, usersResponse, bookingsResponse] = await Promise.all([
        api.get('/admin/dashboard/stats').catch(err => {
          console.error('Stats error:', err);
          return { data: { data: {} } };
        }),
        api.get('/admin/users?limit=5&sort=created_at:desc').catch(err => {
          console.error('Users error:', err);
          return { data: { data: [] } };
        }),
        api.get('/admin/bookings?limit=5&sort=created_at:desc').catch(err => {
          console.error('Bookings error:', err);
          return { data: { data: [] } };
        })
      ]);
      
      setStats({
        totalUsers: statsResponse.data?.data?.totalUsers || 0,
        activeUsers: statsResponse.data?.data?.activeUsers || 0,
        totalBookings: statsResponse.data?.data?.totalBookings || 0,
        todayBookings: statsResponse.data?.data?.todayBookings || 0,
        totalSlots: statsResponse.data?.data?.totalSlots || 0,
        availableSlots: statsResponse.data?.data?.availableSlots || 0,
        recentUsers: usersResponse.data?.data || [],
        recentBookings: bookingsResponse.data?.data || []
      });
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setError('Eroare la încărcarea datelor. Verifică consola pentru detalii.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => {
              setLoading(true);
              loadDashboardData();
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reîncearcă
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard Administrare
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitorizează și gestionează sistemul de programări
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Utilizatori</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.activeUsers} activi
              </p>
            </div>
            <Users className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Programări</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
              <p className="text-sm text-blue-600 mt-1">
                {stats.todayBookings} astăzi
              </p>
            </div>
            <Calendar className="h-12 w-12 text-green-500" />
          </div>
        </div>

        {/* Available Slots */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sloturi Disponibile</p>
              <p className="text-3xl font-bold text-gray-900">{stats.availableSlots}</p>
              <p className="text-sm text-gray-600 mt-1">
                din {stats.totalSlots} total
              </p>
            </div>
            <Clock className="h-12 w-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/users/new"
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <UserPlus className="h-5 w-5" />
          <span className="font-medium">Adaugă Utilizator</span>
        </Link>

        <Link
          href="/admin/slots/new"
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center justify-center space-x-2 text-green-600 hover:text-green-800"
        >
          <CalendarPlus className="h-5 w-5" />
          <span className="font-medium">Adaugă Slot</span>
        </Link>

        <Link
          href="/admin/bookings"
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center justify-center space-x-2 text-purple-600 hover:text-purple-800"
        >
          <Eye className="h-5 w-5" />
          <span className="font-medium">Vezi Programări</span>
        </Link>

        <Link
          href="/admin/stats"
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center justify-center space-x-2 text-orange-600 hover:text-orange-800"
        >
          <TrendingUp className="h-5 w-5" />
          <span className="font-medium">Statistici</span>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Utilizatori Recenți
            </h3>
          </div>
          <div className="p-6">
            {stats.recentUsers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Nu există utilizatori recenți
              </p>
            ) : (
              <div className="space-y-4">
                {stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status}
                      </span>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/admin/users"
              className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-800"
            >
              Vezi toți utilizatorii →
            </Link>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Programări Recente
            </h3>
          </div>
          <div className="p-6">
            {stats.recentBookings.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Nu există programări recente
              </p>
            ) : (
              <div className="space-y-4">
                {stats.recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {booking.user_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {booking.date && format(new Date(booking.date), 'dd MMM yyyy', { locale: ro })} - {booking.start_time}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status}
                      </span>
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/admin/bookings"
              className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-800"
            >
              Vezi toate programările →
            </Link>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Status Sistem
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Bază de date</p>
              <p className="text-xs text-gray-500">Funcțională</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email Service</p>
              <p className="text-xs text-gray-500">Neconfigurat</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">API</p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}