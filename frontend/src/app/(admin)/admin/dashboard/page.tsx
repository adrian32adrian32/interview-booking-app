'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, startOfWeek, endOfWeek, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ro } from 'date-fns/locale';
import { 
  Users, Calendar, Clock, TrendingUp, 
  UserPlus, CalendarPlus, Eye, Activity,
  ChevronRight, AlertCircle, CheckCircle,
  XCircle, Loader, BarChart3, PieChart,
  FileText, Bell, Settings, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  availableSlots: number;
  todayBookings: number;
  tomorrowBookings: number;
  weekBookings: number;
  monthBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  conversionRate: number;
  growthRate: number;
}

interface Booking {
  id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  interview_date: string;
  interview_time: string;
  interview_type: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    tension?: number;
  }[];
}

export default function EnhancedDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBookings: 0,
    availableSlots: 0,
    todayBookings: 0,
    tomorrowBookings: 0,
    weekBookings: 0,
    monthBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    conversionRate: 0,
    growthRate: 0
  });

  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<ChartData | null>(null);
  const [statusChartData, setStatusChartData] = useState<ChartData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // router.push("/login");
        return;
      }

      // Fetch toate datele necesare
      const [usersRes, bookingsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/bookings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!usersRes.ok || !bookingsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const usersData = await usersRes.json();
      const bookingsData = await bookingsRes.json();

      // Procesează datele
      const users = usersData.data || usersData || [];
      const bookings: Booking[] = Array.isArray(bookingsData) ? bookingsData : bookingsData.data || [];
      
      // Calculează statistici
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      // Filtrează booking-urile
      const todayBookings = bookings.filter(b => b.interview_date.startsWith(todayStr));
      const tomorrowBookings = bookings.filter(b => b.interview_date.startsWith(tomorrowStr));
      const weekBookings = bookings.filter(b => {
        const date = parseISO(b.interview_date);
        return date >= weekStart && date <= weekEnd;
      });
      const monthBookings = bookings.filter(b => {
        const date = parseISO(b.interview_date);
        return date >= monthStart && date <= monthEnd;
      });

      // Calculează statistici pe status
      const statusCounts = bookings.reduce((acc: any, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {});

      // Calculează rata de conversie
      const completedCount = statusCounts.completed || 0;
      const totalBookingsCount = bookings.length;
      const conversionRate = totalBookingsCount > 0 
        ? Math.round((completedCount / totalBookingsCount) * 100)
        : 0;

      // Calculează rata de creștere (compară cu săptămâna trecută)
      const lastWeekStart = subDays(weekStart, 7);
      const lastWeekEnd = subDays(weekEnd, 7);
      const lastWeekBookings = bookings.filter(b => {
        const date = parseISO(b.interview_date);
        return date >= lastWeekStart && date <= lastWeekEnd;
      });
      const growthRate = lastWeekBookings.length > 0
        ? Math.round(((weekBookings.length - lastWeekBookings.length) / lastWeekBookings.length) * 100)
        : 0;

      // Setează statisticile
      setStats({
        totalUsers: users.length,
        totalBookings: bookings.length,
        availableSlots: 18 * 5, // 18 sloturi pe zi * 5 zile lucrătoare
        todayBookings: todayBookings.length,
        tomorrowBookings: tomorrowBookings.length,
        weekBookings: weekBookings.length,
        monthBookings: monthBookings.length,
        completedBookings: statusCounts.completed || 0,
        cancelledBookings: statusCounts.cancelled || 0,
        pendingBookings: statusCounts.pending || 0,
        conversionRate,
        growthRate
      });

      // Setează booking-urile recente
      setRecentBookings(bookings.slice(0, 5));

      // Pregătește datele pentru grafice
      prepareChartData(bookings);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Eroare la încărcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (bookings: Booking[]) => {
    // Date pentru graficul săptămânal
    const weekDays = [];
    const bookingCounts = [];
    const completedCounts = [];
    const cancelledCounts = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      weekDays.push(format(date, 'EEE', { locale: ro }));
      
      const dayBookings = bookings.filter(b => b.interview_date.startsWith(dateStr));
      bookingCounts.push(dayBookings.length);
      completedCounts.push(dayBookings.filter(b => b.status === 'completed').length);
      cancelledCounts.push(dayBookings.filter(b => b.status === 'cancelled').length);
    }

    setWeeklyChartData({
      labels: weekDays,
      datasets: [
        {
          label: 'Total',
          data: bookingCounts,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Finalizate',
          data: completedCounts,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        },
        {
          label: 'Anulate',
          data: cancelledCounts,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    });

    // Date pentru graficul de status
    const statusCounts = bookings.reduce((acc: any, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});

    setStatusChartData({
      labels: ['În așteptare', 'Confirmate', 'Finalizate', 'Anulate'],
      datasets: [{
        label: 'Programări',
        data: [
          statusCounts.pending || 0,
          statusCounts.confirmed || 0,
          statusCounts.completed || 0,
          statusCounts.cancelled || 0
        ],
        backgroundColor: [
          'rgba(251, 191, 36, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }]
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status === 'pending' ? 'În așteptare' : 
         status === 'confirmed' ? 'Confirmat' :
         status === 'completed' ? 'Finalizat' : 'Anulat'}
      </span>
    );
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      stats,
      period: selectedPeriod
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raport-dashboard-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Raport exportat cu succes!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header cu acțiuni */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitorizează performanța și gestionează sistemul
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Raport
          </button>
          <button
            onClick={() => router.push('/admin/settings')}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Setări
          </button>
        </div>
      </div>

      {/* Notificări importante */}
      {stats.todayBookings > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
          <Bell className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              {stats.todayBookings} interviuri programate astăzi
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Verifică lista de programări pentru detalii complete.
            </p>
          </div>
          <Link
            href="/admin/bookings?filter=today"
            className="ml-4 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Vezi programările →
          </Link>
        </div>
      )}

      {/* Statistici principale - Grid îmbunătățit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Utilizatori */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            {stats.growthRate > 0 && (
              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                +{stats.growthRate}%
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsers}</h3>
          <p className="text-sm text-gray-600 mt-1">Total utilizatori</p>
          <Link 
            href="/admin/users" 
            className="text-sm text-blue-600 hover:text-blue-800 mt-3 inline-flex items-center gap-1"
          >
            Vezi detalii <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 2: Programări totale */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">
              Luna: {stats.monthBookings}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalBookings}</h3>
          <p className="text-sm text-gray-600 mt-1">Total programări</p>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              {stats.completedBookings} finalizate
            </span>
            <span className="ml-3 flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              {stats.cancelledBookings} anulate
            </span>
          </div>
        </div>

        {/* Card 3: Programări astăzi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">
              Mâine: {stats.tomorrowBookings}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.todayBookings}</h3>
          <p className="text-sm text-gray-600 mt-1">Interviuri astăzi</p>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${(stats.todayBookings / 18) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{18 - stats.todayBookings} sloturi libere</p>
          </div>
        </div>

        {/* Card 4: Rata de conversie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</h3>
          <p className="text-sm text-gray-600 mt-1">Rata de conversie</p>
          <Link 
            href="/admin/statistics" 
            className="text-sm text-orange-600 hover:text-orange-800 mt-3 inline-flex items-center gap-1"
          >
            Vezi statistici <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Grafice și analize */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafic săptămânal */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Evoluție săptămânală</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPeriod('week')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedPeriod === 'week' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Săptămână
              </button>
              <button
                onClick={() => setSelectedPeriod('month')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedPeriod === 'month' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Lună
              </button>
            </div>
          </div>
          
          {/* Simulare grafic - În producție folosește Chart.js sau Recharts */}
          <div className="h-64 flex items-end justify-between gap-2">
            {weeklyChartData?.labels.map((day, index) => {
              const maxValue = Math.max(...(weeklyChartData.datasets[0].data || [1]));
              const value = weeklyChartData.datasets[0].data[index] || 0;
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <div key={day} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end h-48">
                    <span className="text-xs text-gray-600 mb-1">{value}</span>
                    <div 
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 mt-2">{day}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Total programări</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">Finalizate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">Anulate</span>
            </div>
          </div>
        </div>

        {/* Distribuție status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Distribuție status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">În așteptare</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.pendingBookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Confirmate</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats.totalBookings - stats.pendingBookings - stats.completedBookings - stats.cancelledBookings}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Finalizate</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.completedBookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Anulate</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.cancelledBookings}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <Link
              href="/admin/bookings"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Vezi toate programările
            </Link>
          </div>
        </div>
      </div>

      {/* Programări recente și acțiuni rapide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Programări recente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Programări recente</h2>
            <Link 
              href="/admin/bookings" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Vezi toate →
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentBookings.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Nu există programări recente
              </div>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {booking.client_name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(parseISO(booking.interview_date), 'dd MMM yyyy', { locale: ro })} • {booking.interview_time}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {booking.interview_type === 'online' ? 'Online' : 'În persoană'}
                      </p>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acțiuni rapide */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acțiuni rapide</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/bookings/new"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
            >
              <CalendarPlus className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-900">Programare nouă</span>
            </Link>

            <Link
              href="/admin/users/new"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
            >
              <UserPlus className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-900">Utilizator nou</span>
            </Link>

            <Link
              href="/admin/statistics"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
            >
              <BarChart3 className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-900">Statistici</span>
            </Link>

            <Link
              href="/admin/settings"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <Settings className="w-8 h-8 text-gray-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-900">Setări</span>
            </Link>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Notificări activate
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Vei primi notificări pentru programări noi și modificări importante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}