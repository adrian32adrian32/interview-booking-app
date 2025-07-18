'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { format, isToday, isTomorrow, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import { 
  Users, Calendar, Clock, TrendingUp, 
  UserPlus, CalendarPlus, Eye, Activity,
  ChevronRight, AlertCircle, CheckCircle,
  XCircle, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  availableSlots: number;
  todayBookings: number;
  tomorrowBookings: number;
  weekBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  conversionRate: number;
}

interface RecentActivity {
  id: number;
  type: 'booking' | 'user' | 'slot';
  action: string;
  description: string;
  timestamp: string;
  user?: string;
  status?: string;
}

interface UpcomingBooking {
  id: number;
  candidate_name: string;
  candidate_email: string;
  booking_date: string;
  start_time: string;
  interview_type: string;
  interviewer_name?: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBookings: 0,
    availableSlots: 0,
    todayBookings: 0,
    tomorrowBookings: 0,
    weekBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    conversionRate: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, bookingsRes, slotsRes] = await Promise.all([
        api.get('/users'),
        api.get('/bookings'),
        api.get('/time-slots')
      ]);

      // Calculate stats
      const users = usersRes.data.data || [];
      const bookings = bookingsRes.data.data || [];
      const slots = slotsRes.data.data || [];

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0];
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const stats: DashboardStats = {
        totalUsers: users.length,
        totalBookings: bookings.length,
        availableSlots: slots.filter((s: any) => s.is_active).length,
        todayBookings: bookings.filter((b: any) => b.booking_date === today && b.status !== 'cancelled').length,
        tomorrowBookings: bookings.filter((b: any) => b.booking_date === tomorrow && b.status !== 'cancelled').length,
        weekBookings: bookings.filter((b: any) => {
          const date = parseISO(b.booking_date);
          return date >= weekStart && date <= weekEnd && b.status !== 'cancelled';
        }).length,
        completedBookings: bookings.filter((b: any) => b.status === 'completed').length,
        cancelledBookings: bookings.filter((b: any) => b.status === 'cancelled').length,
        conversionRate: bookings.length > 0 
          ? Math.round((bookings.filter((b: any) => b.status === 'completed').length / bookings.length) * 100)
          : 0
      };

      setStats(stats);

      // Get upcoming bookings (next 5)
      const upcoming = bookings
        .filter((b: any) => {
          const bookingDate = parseISO(b.booking_date);
          return bookingDate >= new Date() && b.status !== 'cancelled';
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(`${a.booking_date} ${a.start_time}`);
          const dateB = new Date(`${b.booking_date} ${b.start_time}`);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 5);

      setUpcomingBookings(upcoming);

      // Generate recent activity
      const activities: RecentActivity[] = [];
      
      // Recent bookings
      bookings.slice(0, 3).forEach((booking: any) => {
        activities.push({
          id: booking.id,
          type: 'booking',
          action: booking.status === 'scheduled' ? 'Programare nouă' : 'Programare actualizată',
          description: `${booking.candidate_name} - ${format(parseISO(booking.booking_date), 'dd MMM', { locale: ro })}`,
          timestamp: booking.created_at,
          user: booking.candidate_name,
          status: booking.status
        });
      });

      // Recent users
      users.slice(0, 2).forEach((user: any) => {
        activities.push({
          id: user.id,
          type: 'user',
          action: 'Utilizator nou',
          description: `${user.name || user.email} s-a înregistrat`,
          timestamp: user.created_at,
          user: user.name
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 5));

      // Calculate weekly booking data for chart
      const weeklyBookings = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayBookings = bookings.filter((b: any) => b.booking_date === dateStr);
        
        weeklyBookings.push({
          day: format(date, 'EEE', { locale: ro }),
          date: dateStr,
          total: dayBookings.length,
          completed: dayBookings.filter((b: any) => b.status === 'completed').length,
          cancelled: dayBookings.filter((b: any) => b.status === 'cancelled').length
        });
      }
      setWeeklyData(weeklyBookings);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Eroare la încărcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-4 h-4" />;
      case 'user':
        return <UserPlus className="w-4 h-4" />;
      case 'slot':
        return <Clock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-gray-600">
          Bine ai venit! Aici poți gestiona aplicația.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Utilizatori</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.totalUsers}</p>
              <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1">
                Vezi toți utilizatorii <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Programări</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.totalBookings}</p>
              <Link href="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1">
                Vezi toate programările <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Today's Bookings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Programări Azi</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.todayBookings}</p>
              <p className="text-sm text-gray-500 mt-1">Mâine: {stats.tomorrowBookings}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rata de Conversie</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.conversionRate}%</p>
              <p className="text-sm text-gray-500 mt-1">Finalizate: {stats.completedBookings}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Programări Săptămânale</h2>
          <div className="space-y-4">
            {weeklyData.map((day) => (
              <div key={day.date} className="flex items-center">
                <div className="w-16 text-sm font-medium text-gray-600">
                  {day.day}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      {day.total > 0 && (
                        <>
                          <div
                            className="absolute top-0 left-0 h-full bg-green-500 transition-all"
                            style={{ width: `${(day.completed / day.total) * 100}%` }}
                          />
                          <div
                            className="absolute top-0 h-full bg-red-500 transition-all"
                            style={{ 
                              left: `${(day.completed / day.total) * 100}%`,
                              width: `${(day.cancelled / day.total) * 100}%` 
                            }}
                          />
                        </>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {day.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">Finalizate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">Anulate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span className="text-gray-600">Programate</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Statistici Rapide</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Săptămâna aceasta</span>
              <span className="text-lg font-semibold text-gray-900">{stats.weekBookings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sloturi disponibile</span>
              <span className="text-lg font-semibold text-gray-900">{stats.availableSlots}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Finalizate</span>
              <span className="text-lg font-semibold text-green-600">{stats.completedBookings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Anulate</span>
              <span className="text-lg font-semibold text-red-600">{stats.cancelledBookings}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Programări Următoare</h2>
            <Link href="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-800">
              Vezi toate
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingBookings.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Nu există programări în perioada următoare
              </div>
            ) : (
              upcomingBookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {booking.candidate_name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(parseISO(booking.booking_date), 'dd MMM', { locale: ro })} • {booking.start_time}
                      </p>
                      {booking.interviewer_name && (
                        <p className="text-xs text-gray-400 mt-1">
                          Cu {booking.interviewer_name}
                        </p>
                      )}
                    </div>
                    <div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Activitate Recentă</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Nu există activitate recentă
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(parseISO(activity.timestamp), 'dd MMM, HH:mm', { locale: ro })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/admin/users/new"
          className="flex items-center justify-center gap-2 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <UserPlus className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">Adaugă Utilizator</span>
        </Link>
        
        <Link
          href="/admin/bookings/new"
          className="flex items-center justify-center gap-2 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <CalendarPlus className="w-5 h-5 text-green-600" />
          <span className="font-medium text-gray-900">Adaugă Slot</span>
        </Link>
        
        <Link
          href="/admin/bookings"
          className="flex items-center justify-center gap-2 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <Eye className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-gray-900">Vezi Programări</span>
        </Link>
        
        <Link
          href="/admin/statistics"
          className="flex items-center justify-center gap-2 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <Activity className="w-5 h-5 text-orange-600" />
          <span className="font-medium text-gray-900">Vezi Statistici</span>
        </Link>
      </div>
    </div>
  );
}