'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { getChartColors } from '@/lib/chartTheme';
import axios from '@/lib/axios';
import { Users, Calendar, Clock, TrendingUp, ChevronRight, UserPlus, CalendarPlus } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardStats() {
  const router = useRouter();
  const { theme } = useTheme();
  const chartColors = getChartColors(theme);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    todayInterviews: 0,
    conversionRate: 0,
    bookingsByStatus: {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    },
    recentBookings: [],
    weeklyBookings: []
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('week');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, bookingsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/bookings')
      ]);

      const users = usersRes.data.data || [];
      const bookings = bookingsRes.data || [];

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayInterviews = bookings.filter((b: any) => 
        b.interview_date.split('T')[0] === today && b.status !== 'cancelled'
      ).length;

      const completedBookings = bookings.filter((b: any) => b.status === 'completed').length;
      const conversionRate = bookings.length > 0 
        ? Math.round((completedBookings / bookings.length) * 100) 
        : 0;

      // Count by status
      const bookingsByStatus = {
        pending: bookings.filter((b: any) => b.status === 'pending').length,
        confirmed: bookings.filter((b: any) => b.status === 'confirmed').length,
        completed: bookings.filter((b: any) => b.status === 'completed').length,
        cancelled: bookings.filter((b: any) => b.status === 'cancelled').length,
      };

      // Recent bookings
      const recentBookings = bookings.slice(0, 5);

      setStats({
        totalUsers: users.length,
        totalBookings: bookings.length,
        todayInterviews,
        conversionRate,
        bookingsByStatus,
        recentBookings,
        weeklyBookings: bookings
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-600 dark:text-gray-400 futuristic:text-cyan-200">Se încarcă...</div>;
  }

  // Chart data with dynamic colors
  const statusChartData = {
    labels: ['În așteptare', 'Confirmate', 'Finalizate', 'Anulate'],
    datasets: [{
      data: [
        stats.bookingsByStatus.pending,
        stats.bookingsByStatus.confirmed,
        stats.bookingsByStatus.completed,
        stats.bookingsByStatus.cancelled
      ],
      backgroundColor: [
        chartColors.warning,     // pentru pending (galben)
        chartColors.primary,     // pentru confirmed (albastru)
        chartColors.success,     // pentru completed (verde)
        chartColors.danger       // pentru cancelled (roșu)
      ],
      borderColor: theme === 'dark' || theme === 'futuristic' ? 'transparent' : '#ffffff',
      borderWidth: 2
    }]
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">Total utilizatori</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 futuristic:bg-cyan-500/20 rounded-full">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400" />
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/users')}
            className="mt-4 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 text-sm flex items-center hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
          >
            Vezi detalii <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">Total programări</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{stats.totalBookings}</p>
              <div className="mt-1 flex gap-2 text-xs">
                <span className="text-green-600 dark:text-green-400 futuristic:text-green-400">● {stats.bookingsByStatus.confirmed} finalizate</span>
                <span className="text-yellow-600 dark:text-yellow-400 futuristic:text-yellow-400">● {stats.bookingsByStatus.pending} anulate</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 futuristic:bg-green-500/20 rounded-full">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-400 futuristic:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">Interviuri astăzi</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{stats.todayInterviews}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50 mt-1">
                {stats.todayInterviews > 0 ? `${stats.todayInterviews} sloturi libere` : '18 sloturi libere'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 futuristic:bg-purple-500/20 rounded-full">
              <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400 futuristic:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">Rata de conversie</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{stats.conversionRate}%</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 futuristic:bg-orange-500/20 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400 futuristic:text-orange-400" />
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/statistics')}
            className="mt-4 text-orange-600 dark:text-orange-400 futuristic:text-orange-400 text-sm flex items-center hover:text-orange-800 dark:hover:text-orange-300 futuristic:hover:text-orange-300"
          >
            Vezi statistici <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Evoluție săptămânală</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeFilter('week')}
                className={`px-3 py-1 rounded text-sm ${
                  timeFilter === 'week' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 futuristic:bg-cyan-500/20 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400' 
                    : 'text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30'
                }`}
              >
                Săptămână
              </button>
              <button
                onClick={() => setTimeFilter('month')}
                className={`px-3 py-1 rounded text-sm ${
                  timeFilter === 'month' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 futuristic:bg-cyan-500/20 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400' 
                    : 'text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30'
                }`}
              >
                Lună
              </button>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50">
            <p>Grafic în dezvoltare</p>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Distribuție status</h3>
          <div className="h-64">
            <Doughnut 
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: chartColors.textColor,
                      padding: 15,
                      font: {
                        size: 12
                      },
                      usePointStyle: true,
                      pointStyle: 'circle'
                    }
                  },
                  tooltip: {
                    backgroundColor: theme === 'futuristic' ? 'rgba(10, 14, 39, 0.9)' : theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: chartColors.textColor,
                    bodyColor: chartColors.textColor,
                    borderColor: chartColors.borderColor,
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 4
                  }
                }
              }}
            />
          </div>
          <button
            onClick={() => router.push('/admin/bookings')}
            className="mt-4 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 text-sm flex items-center hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300 mx-auto"
          >
            Vezi toate programările
          </button>
        </div>
      </div>

      {/* Recent Bookings & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Programări recente</h3>
          </div>
          <div className="p-6">
            {stats.recentBookings.length > 0 ? (
              <div className="space-y-4">
                {stats.recentBookings.map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{booking.client_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50">
                        {new Date(booking.interview_date).toLocaleDateString('ro-RO')} la {booking.interview_time}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      booking.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 futuristic:bg-green-500/20 text-green-800 dark:text-green-400 futuristic:text-green-400' :
                      booking.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 futuristic:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 futuristic:text-yellow-400' :
                      booking.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30 futuristic:bg-blue-500/20 text-blue-800 dark:text-blue-400 futuristic:text-blue-400' :
                      'bg-red-100 dark:bg-red-900/30 futuristic:bg-red-500/20 text-red-800 dark:text-red-400 futuristic:text-red-400'
                    }`}>
                      {booking.status === 'confirmed' ? 'Confirmat' :
                       booking.status === 'pending' ? 'În așteptare' :
                       booking.status === 'completed' ? 'Finalizat' : 'Anulat'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50 text-center py-8">Nu există programări recente</p>
            )}
            <button
              onClick={() => router.push('/admin/bookings')}
              className="mt-4 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 text-sm hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
            >
              Vezi toate →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Acțiuni rapide</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/admin/bookings/new')}
              className="w-full p-4 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30 flex items-center transition-colors"
            >
              <CalendarPlus className="h-5 w-5 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Programare nouă</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">Creează o programare pentru un client</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/admin/users/new')}
              className="w-full p-4 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30 flex items-center transition-colors"
            >
              <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400 futuristic:text-green-400 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Utilizator nou</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">Adaugă un utilizator în sistem</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}