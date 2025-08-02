'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ro, enUS, it, fr, de, es, ru, uk } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Hash
} from 'lucide-react';
import { toastService } from '@/services/toastService';

interface Booking {
  id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  interview_date: string;
  interview_time: string;
  interview_type: 'online' | 'in_person';
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at: string;
  documents_count?: number;
}

export default function BookingsPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const searchParams = useSearchParams();
  const userEmail = searchParams.get('user_email');

  const pageSizeOptions = [10, 25, 50, 100, 250, 500, -1]; // -1 pentru "Toți"

  // Helper function pentru date locale
  const getDateLocale = () => {
    switch (language) {
      case 'ro': return ro;
      case 'en': return enUS;
      case 'it': return it;
      case 'fr': return fr;
      case 'de': return de;
      case 'es': return es;
      case 'ru': return ru;
      case 'uk': return uk;
      default: return enUS;
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toastService.error('error.loadingBookings');
    } finally {
      setLoading(false);
    }
  };

  // Filtrare și sortare programări
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = [...bookings];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.client_phone.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(booking => booking.interview_type === typeFilter);
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.interview_date);
        return bookingDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.interview_date);
        return bookingDate >= now && bookingDate <= weekFromNow;
      });
    } else if (dateFilter === 'month') {
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.interview_date);
        return bookingDate >= now && bookingDate <= monthFromNow;
      });
    }

    // Filter by user email if provided
    if (userEmail) {
      filtered = filtered.filter(booking => 
        booking.client_email.toLowerCase() === userEmail.toLowerCase()
      );
    }

    // Sortare după data creării
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [bookings, searchTerm, statusFilter, typeFilter, dateFilter, userEmail, sortOrder]);

  // Paginare
  const paginatedBookings = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedBookings; // Afișează toate

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedBookings.slice(startIndex, endIndex);
  }, [filteredAndSortedBookings, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredAndSortedBookings.length / pageSize);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset la prima pagină
  };

  const updateBookingStatus = async (id: number, status: 'confirmed' | 'cancelled') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update booking');

      toastService.success(
        status === 'confirmed' 
          ? t('bookings.bookingConfirmed') 
          : t('bookings.bookingCancelled')
      );
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      toastService.error('error.updateBooking');
    }
  };

  const deleteBooking = async (id: number) => {
    if (!confirm(t('bookings.deleteConfirm'))) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete booking');

      toastService.success('success.generic', t('bookings.bookingDeleted'));
      fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toastService.error('error.deleteBooking');
    }
  };

  const exportBookings = () => {
    const headers = [
      '#',
      t('common.name'),
      t('common.email'),
      t('common.phone'),
      t('common.date'),
      t('common.time'),
      t('common.type'),
      t('common.status'),
      t('common.notes'),
      t('common.createdAt')
    ];

    const csv = [
      headers,
      ...filteredAndSortedBookings.map((b, index) => [
        index + 1,
        b.client_name,
        b.client_email,
        b.client_phone,
        b.interview_date,
        b.interview_time,
        b.interview_type,
        b.status,
        b.notes || '',
        b.created_at
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t('bookings.filename')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 futuristic:text-green-400" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400 futuristic:text-red-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400 futuristic:text-yellow-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 futuristic:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 futuristic:text-yellow-300',
      confirmed: 'bg-green-100 dark:bg-green-900/30 futuristic:bg-green-500/20 text-green-800 dark:text-green-400 futuristic:text-green-300',
      cancelled: 'bg-red-100 dark:bg-red-900/30 futuristic:bg-red-500/20 text-red-800 dark:text-red-400 futuristic:text-red-300'
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 futuristic:border-cyan-400"></div>
      </div>
    );
  }

  const startIndex = pageSize === -1 ? 0 : (currentPage - 1) * pageSize;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          {t('bookings.title')} ({filteredAndSortedBookings.length})
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/bookings/new')}
            className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('bookings.newBooking')}
          </button>
          <button
            onClick={exportBookings}
            className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 futuristic:bg-green-600 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 futuristic:hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('common.exportCSV')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-4 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 space-y-4 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
            <input
              type="text"
              placeholder={t('bookings.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-cyan-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
          >
            <option value="all">{t('bookings.allStatuses')}</option>
            <option value="pending">{t('common.pending')}</option>
            <option value="confirmed">{t('bookings.confirmed')}</option>
            <option value="cancelled">{t('bookings.cancelled')}</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
          >
            <option value="all">{t('bookings.allTypes')}</option>
            <option value="online">{t('common.online')}</option>
            <option value="in_person">{t('common.inPerson')}</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
          >
            <option value="all">{t('bookings.allDates')}</option>
            <option value="today">{t('common.today')}</option>
            <option value="week">{t('bookings.thisWeek')}</option>
            <option value="month">{t('bookings.thisMonth')}</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">{t('common.show')}:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>
                    {size === -1 ? t('common.all') : size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">{t('bookings.bookingsPerPage')}</span>
            </div>
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
          >
            <option value="newest">{t('bookings.newest')}</option>
            <option value="oldest">{t('bookings.oldest')}</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 overflow-hidden border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 futuristic:divide-purple-500/30">
            <thead className="bg-gray-50 dark:bg-gray-900 futuristic:bg-purple-900/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  {t('bookings.client')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  {t('bookings.dateAndTime')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  {t('common.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  {t('common.documents')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 divide-y divide-gray-200 dark:divide-gray-700 futuristic:divide-purple-500/20">
              {paginatedBookings.map((booking, index) => (
                <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 futuristic:hover:bg-purple-800/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
                    {filteredAndSortedBookings.length - (startIndex + index)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                        {booking.client_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 flex items-center mt-1">
                        <Mail className="h-3 w-3 mr-2" />
                        {booking.client_email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-2" />
                        {booking.client_phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                        {format(new Date(booking.interview_date), 'dd MMM yyyy', { locale: getDateLocale() })}
                      </div>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                        {booking.interview_time}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
                      {booking.interview_type === 'online' ? (
                        <>
                          <Video className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400 futuristic:text-cyan-400" />
                          {t('common.online')}
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 futuristic:text-green-400" />
                          {t('common.inPerson')}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span className="ml-1">
                        {booking.status === 'pending' && t('common.pending')}
                        {booking.status === 'confirmed' && t('bookings.confirmed')}
                        {booking.status === 'cancelled' && t('bookings.cancelled')}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className={`h-4 w-4 mr-1 ${
                        booking.documents_count && booking.documents_count > 0
                          ? 'text-green-500 dark:text-green-400 futuristic:text-green-400'
                          : 'text-gray-400 dark:text-gray-500 futuristic:text-purple-400'
                      }`} />
                      <span className={`text-sm ${
                        booking.documents_count && booking.documents_count > 0 
                          ? 'text-green-600 dark:text-green-400 futuristic:text-green-400 font-medium' 
                          : 'text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50'
                      }`}>
                        {booking.documents_count || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="text-green-600 dark:text-green-400 futuristic:text-green-400 hover:text-green-900 dark:hover:text-green-300 futuristic:hover:text-green-300"
                            title={t('common.confirm')}
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="text-red-600 dark:text-red-400 futuristic:text-red-400 hover:text-red-900 dark:hover:text-red-300 futuristic:hover:text-red-300"
                            title={t('common.cancel')}
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => router.push(`/admin/bookings/${booking.id}/edit`)}
                        className="text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-900 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
                        title={t('bookings.viewDetails')}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteBooking(booking.id)}
                        className="text-red-600 dark:text-red-400 futuristic:text-red-400 hover:text-red-900 dark:hover:text-red-300 futuristic:hover:text-red-300"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
              {t('bookings.noBookings')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all'
                ? t('bookings.noBookingsFiltered')
                : t('bookings.noBookingsYet')}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && dateFilter === 'all' && (
              <button
                onClick={() => router.push('/admin/bookings/new')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('bookings.addFirstBooking')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageSize !== -1 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-4 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="text-sm text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/70">
            {t('common.showing')} {startIndex + 1} - {Math.min(startIndex + pageSize, filteredAndSortedBookings.length)} {t('common.of')} {filteredAndSortedBookings.length} {t('bookings.bookings')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white'
                        : 'border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/20'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}