'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { getChartColors, getChartOptions } from '@/lib/chartTheme';
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
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useLanguage } from '@/contexts/LanguageContext';

// IMPORTANT: Înregistrează toate componentele Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardStats() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { theme } = useTheme();
  const chartColors = getChartColors(theme);
  const chartOptions = getChartOptions(theme);
  
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
    weeklyBookings: [],
    weeklyEvolution: []
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('week');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch toate datele necesare
      const [usersRes, bookingsRes, statsRes] = await Promise.all([
        axios.get('/users').catch(err => ({ data: { data: [] } })),
        axios.get('/bookings').catch(err => ({ data: [] })),
        axios.get('/statistics/dashboard').catch(err => ({ data: { data: {} } }))
      ]);

      const users = usersRes.data.data || [];
      const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      const dashboardStats = statsRes.data.data || {};

      console.log('Dashboard stats received:', dashboardStats);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayInterviews = dashboardStats.todayInterviews || bookings.filter((b: any) => 
        b.interview_date && b.interview_date.split('T')[0] === today && b.status !== 'cancelled'
      ).length;

      const completedBookings = bookings.filter((b: any) => b.status === 'completed').length;
      const conversionRate = parseFloat(dashboardStats.conversionRate) || (bookings.length > 0 
        ? Math.round((completedBookings / bookings.length) * 100) 
        : 0);

      // Count by status
      const bookingsByStatus = {
        pending: bookings.filter((b: any) => b.status === 'pending').length,
        confirmed: bookings.filter((b: any) => b.status === 'confirmed').length,
        completed: bookings.filter((b: any) => b.status === 'completed').length,
        cancelled: bookings.filter((b: any) => b.status === 'cancelled').length,
      };

      // Recent bookings
      const recentBookings = bookings.slice(0, 5);

      // Process weekly evolution data
      let weeklyEvolution = dashboardStats.weeklyEvolution || [];
      
      // Dacă nu avem date, creăm date mock pentru ultimele 7 zile
      if (!weeklyEvolution.length) {
        const mockData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          mockData.push({
            week: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 5) + 1,
            completed: Math.floor(Math.random() * 3)
          });
        }
        weeklyEvolution = mockData;
      }

      const newStats = {
        totalUsers: dashboardStats.totalUsers || users.length,
        totalBookings: dashboardStats.totalBookings || bookings.length,
        todayInterviews: todayInterviews,
        conversionRate: conversionRate,
        bookingsByStatus,
        recentBookings,
        weeklyBookings: bookings,
        weeklyEvolution: weeklyEvolution
      };

      console.log('Setting stats:', newStats);
      setStats(newStats);
      
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  // Chart data for weekly evolution
  const weeklyChartData = {
    labels: stats.weeklyEvolution.map((item: any) => {
      const date = new Date(item.week);
      // Folosim formatul potrivit pentru limba curentă
      return date.toLocaleDateString(language === 'ro' ? 'ro-RO' : language === 'en' ? 'en-US' : language + '-' + language.toUpperCase(), { 
        day: 'numeric', 
        month: 'short' 
      });
    }),
    datasets: [
      {
        label: t('dashboard.totalScheduled'),
        data: stats.weeklyEvolution.map((item: any) => parseInt(item.count) || 0),
        borderColor: chartColors.primary || '#3B82F6',
        backgroundColor: chartColors.primary ? `${chartColors.primary}20` : 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: t('dashboard.completed'),
        data: stats.weeklyEvolution.map((item: any) => parseInt(item.completed) || 0),
        borderColor: chartColors.success || '#10B981',
        backgroundColor: chartColors.success ? `${chartColors.success}20` : 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  // Chart data with dynamic colors
  const statusChartData = {
    labels: [t('dashboard.pending'), t('dashboard.confirmed'), t('dashboard.completed'), t('dashboard.cancelled')],
    datasets: [{
      data: [
        stats.bookingsByStatus.pending,
        stats.bookingsByStatus.confirmed,
        stats.bookingsByStatus.completed,
        stats.bookingsByStatus.cancelled
      ],
      backgroundColor: [
        chartColors.warning || '#F59E0B',     // pentru pending (galben)
        chartColors.primary || '#3B82F6',     // pentru confirmed (albastru)
        chartColors.success || '#10B981',     // pentru completed (verde)
        chartColors.danger || '#EF4444'       // pentru cancelled (roșu)
      ],
      borderColor: theme === 'dark' || theme === 'futuristic' ? 'transparent' : '#ffffff',
      borderWidth: 2
    }]
  };

  // Enhanced chart options pentru Line chart
  const lineChartOptions = {
    ...chartOptions,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins?.legend,
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        ...chartOptions.plugins?.tooltip,
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        ...chartOptions.scales?.x,
        display: true,
        grid: {
          ...chartOptions.scales?.x?.grid,
          display: false,
        }
      },
      y: {
        ...chartOptions.scales?.y,
        display: true,
        beginAtZero: true,
        ticks: {
          ...chartOptions.scales?.y?.ticks,
          stepSize: 1,
        }
      }
    }
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">{t('dashboard.totalUsers')}</p>
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
            {t('dashboard.viewDetails')} <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">{t('dashboard.totalBookings')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{stats.totalBookings}</p>
              <div className="mt-1 flex gap-2 text-xs">
                <span className="text-green-600 dark:text-green-400 futuristic:text-green-400">● {stats.bookingsByStatus.confirmed} {t('dashboard.finalized')}</span>
                <span className="text-yellow-600 dark:text-yellow-400 futuristic:text-yellow-400">● {stats.bookingsByStatus.pending} {t('dashboard.cancelled')}</span>
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
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">{t('dashboard.interviewsToday')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{stats.todayInterviews}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50 mt-1">
                {stats.todayInterviews > 0 
                  ? `${18 - stats.todayInterviews} ${t('dashboard.freeSlots')}` 
                  : `18 ${t('dashboard.freeSlots')}`}
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
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">{t('dashboard.conversionRate')}</p>
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
            {t('dashboard.viewStatistics')} <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('dashboard.weeklyEvolution')}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeFilter('week')}
                className={`px-3 py-1 rounded text-sm ${
                  timeFilter === 'week' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 futuristic:bg-cyan-500/20 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400' 
                    : 'text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30'
                }`}
              >
                {t('common.week')}
              </button>
              <button
                onClick={() => setTimeFilter('month')}
                className={`px-3 py-1 rounded text-sm ${
                  timeFilter === 'month' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 futuristic:bg-cyan-500/20 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400' 
                    : 'text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30'
                }`}
              >
                {t('common.month')}
              </button>
            </div>
          </div>
          <div className="h-64">
            {stats.weeklyEvolution && stats.weeklyEvolution.length > 0 ? (
              <Line 
                data={weeklyChartData} 
                options={lineChartOptions}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50">
                <p>{t('dashboard.noDataForChart')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('dashboard.statusDistribution')}</h3>
          <div className="h-64">
            <Doughnut 
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
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
            {t('dashboard.viewAllBookings')}
          </button>
        </div>
      </div>

      {/* Recent Bookings & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('dashboard.recentBookings')}</h3>
          </div>
          <div className="p-6">
            {stats.recentBookings.length > 0 ? (
              <div className="space-y-4">
                {stats.recentBookings.map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{booking.client_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50">
                        {new Date(booking.interview_date).toLocaleDateString(
                          language === 'ro' ? 'ro-RO' : language === 'en' ? 'en-US' : language + '-' + language.toUpperCase()
                        )} {t('common.at')} {booking.interview_time}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      booking.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 futuristic:bg-green-500/20 text-green-800 dark:text-green-400 futuristic:text-green-400' :
                      booking.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 futuristic:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 futuristic:text-yellow-400' :
                      booking.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30 futuristic:bg-blue-500/20 text-blue-800 dark:text-blue-400 futuristic:text-blue-400' :
                      'bg-red-100 dark:bg-red-900/30 futuristic:bg-red-500/20 text-red-800 dark:text-red-400 futuristic:text-red-400'
                    }`}>
                      {booking.status === 'confirmed' ? t('dashboard.confirmed') :
                       booking.status === 'pending' ? t('dashboard.pending') :
                       booking.status === 'completed' ? t('dashboard.finalized') : 
                       t('dashboard.cancelled')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50 text-center py-8">{t('dashboard.noRecentBookings')}</p>
            )}
            <button
              onClick={() => router.push('/admin/bookings')}
              className="mt-4 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 text-sm hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
            >
              {t('common.viewAll')} →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-6 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('dashboard.quickActions')}</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/admin/bookings/new')}
              className="w-full p-4 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30 flex items-center transition-colors"
            >
              <CalendarPlus className="h-5 w-5 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('dashboard.newBooking')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">{t('dashboard.createBookingForClient')}</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/admin/users/new')}
              className="w-full p-4 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30 flex items-center transition-colors"
            >
              <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400 futuristic:text-green-400 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('dashboard.addUser')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">{t('dashboard.addUserDesc')}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}