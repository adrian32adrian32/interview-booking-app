'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { format, parseISO, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import { 
  Calendar, Clock, User, Mail, Phone, MapPin, FileText, 
  MoreVertical, Edit, Trash2, CheckCircle, XCircle, 
  AlertCircle, Filter, Plus, Search, ChevronLeft, ChevronRight,
  Video, Building, RefreshCw
} from 'lucide-react';

interface Booking {
  id: number;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  interviewer_id?: number;
  interviewer_name?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  interview_type: string;
  status: string;
  location?: string;
  meeting_link?: string;
  notes?: string;
  created_at: string;
}

interface Stats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  today: number;
  tomorrow: number;
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    today: 0,
    tomorrow: 0
  });
  
  // Filtre și căutare
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    interview_type: '',
    interviewer_id: ''
  });
  
  // Paginare
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Dropdown actions
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterAndSearchBookings();
  }, [bookings, searchTerm, filters]);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      if (response.data.success) {
        setBookings(response.data.data);
        calculateStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Eroare la încărcarea programărilor');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (bookingsData: Booking[]) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0];

    const stats = {
      total: bookingsData.length,
      scheduled: bookingsData.filter(b => b.status === 'scheduled' || b.status === 'confirmed').length,
      completed: bookingsData.filter(b => b.status === 'completed').length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
      today: bookingsData.filter(b => b.booking_date === today && b.status !== 'cancelled').length,
      tomorrow: bookingsData.filter(b => b.booking_date === tomorrow && b.status !== 'cancelled').length
    };
    
    setStats(stats);
  };

  const filterAndSearchBookings = () => {
    let filtered = [...bookings];

    // Căutare
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.candidate_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.candidate_phone?.includes(searchTerm) ||
        booking.interviewer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre
    if (filters.status) {
      filtered = filtered.filter(b => b.status === filters.status);
    }
    if (filters.date) {
      filtered = filtered.filter(b => b.booking_date === filters.date);
    }
    if (filters.interview_type) {
      filtered = filtered.filter(b => b.interview_type === filters.interview_type);
    }
    if (filters.interviewer_id) {
      filtered = filtered.filter(b => b.interviewer_id === parseInt(filters.interviewer_id));
    }

    // Sortare - cele mai recente primele
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.booking_date} ${a.start_time}`);
      const dateB = new Date(`${b.booking_date} ${b.start_time}`);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredBookings(filtered);
    setCurrentPage(1);
  };

  const updateBookingStatus = async (id: number, newStatus: string) => {
    try {
      const endpoint = newStatus === 'cancelled' ? `/bookings/${id}/cancel` : `/bookings/${id}/${newStatus}`;
      const response = await api.post(endpoint);
      
      if (response.data.success) {
        toast.success(`Programarea a fost ${getStatusLabel(newStatus).toLowerCase()}`);
        fetchBookings();
      }
    } catch (error) {
      toast.error('Eroare la actualizarea programării');
    }
  };

  const deleteBooking = async (id: number) => {
    if (!confirm('Ești sigur că vrei să ștergi această programare?')) {
      return;
    }

    try {
      const response = await api.delete(`/bookings/${id}`);
      if (response.data.success) {
        toast.success('Programarea a fost ștearsă');
        fetchBookings();
      }
    } catch (error) {
      toast.error('Eroare la ștergerea programării');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Programat',
      confirmed: 'Confirmat',
      completed: 'Finalizat',
      cancelled: 'Anulat',
      rescheduled: 'Reprogramat',
      no_show: 'Nu s-a prezentat'
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      rescheduled: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: RefreshCw },
      no_show: { bg: 'bg-orange-100', text: 'text-orange-800', icon: AlertCircle }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {getStatusLabel(status)}
      </span>
    );
  };

  const getInterviewTypeBadge = (type: string) => {
    const typeConfig: Record<string, { bg: string; text: string; label: string }> = {
      technical: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Tehnic' },
      hr: { bg: 'bg-pink-100', text: 'text-pink-800', label: 'HR' },
      behavioral: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Behavioral' },
      system_design: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'System Design' },
      final: { bg: 'bg-green-100', text: 'text-green-800', label: 'Final' }
    };

    const config = typeConfig[type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Azi';
    if (isTomorrow(date)) return 'Mâine';
    if (isPast(date)) return format(date, 'dd MMM', { locale: ro });
    return format(date, 'dd MMM', { locale: ro });
  };

  // Paginare
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Programări Interviuri</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestionează toate programările pentru interviuri
            </p>
          </div>
          <Link
            href="/admin/bookings/new"
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Programare Nouă
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
            <div className="text-2xl font-semibold text-blue-900">{stats.scheduled}</div>
            <div className="text-sm text-blue-600">Programate</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
            <div className="text-2xl font-semibold text-green-900">{stats.completed}</div>
            <div className="text-sm text-green-600">Finalizate</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
            <div className="text-2xl font-semibold text-red-900">{stats.cancelled}</div>
            <div className="text-sm text-red-600">Anulate</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
            <div className="text-2xl font-semibold text-yellow-900">{stats.today}</div>
            <div className="text-sm text-yellow-600">Azi</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-200">
            <div className="text-2xl font-semibold text-purple-900">{stats.tomorrow}</div>
            <div className="text-sm text-purple-600">Mâine</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Caută după nume, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Toate statusurile</option>
              <option value="scheduled">Programat</option>
              <option value="confirmed">Confirmat</option>
              <option value="completed">Finalizat</option>
              <option value="cancelled">Anulat</option>
              <option value="no_show">Nu s-a prezentat</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />

            {/* Interview Type Filter */}
            <select
              value={filters.interview_type}
              onChange={(e) => setFilters({ ...filters, interview_type: e.target.value })}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Toate tipurile</option>
              <option value="technical">Tehnic</option>
              <option value="hr">HR</option>
              <option value="behavioral">Behavioral</option>
              <option value="system_design">System Design</option>
              <option value="final">Final</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({ status: '', date: '', interview_type: '', interviewer_id: '' });
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <XCircle className="w-4 h-4" />
              Resetează
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {currentItems.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Nu există programări pentru criteriile selectate</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {currentItems.map((booking) => (
              <li key={booking.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {booking.candidate_name}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {booking.candidate_email}
                          </span>
                          {booking.candidate_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {booking.candidate_phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status)}
                        {getInterviewTypeBadge(booking.interview_type)}
                      </div>
                    </div>

                    {/* Details Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{getDateLabel(booking.booking_date)}</span>
                          {' - '}
                          {format(parseISO(booking.booking_date), 'EEEE, dd MMMM yyyy', { locale: ro })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                          <span className="text-gray-400">({booking.duration} min)</span>
                        </span>
                        {booking.interviewer_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {booking.interviewer_name}
                          </span>
                        )}
                        {booking.location && (
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {booking.location}
                          </span>
                        )}
                        {booking.meeting_link && (
                          <a
                            href={booking.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <Video className="h-4 w-4" />
                            Link Meet
                          </a>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === booking.id ? null : booking.id)}
                          className="p-2 rounded-full hover:bg-gray-100"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </button>
                        
                        {activeDropdown === booking.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  router.push(`/admin/bookings/${booking.id}`);
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                <Edit className="w-4 h-4" />
                                Editează
                              </button>
                              
                              {booking.status === 'scheduled' && (
                                <>
                                  <button
                                    onClick={() => {
                                      updateBookingStatus(booking.id, 'confirm');
                                      setActiveDropdown(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full text-left"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Confirmă
                                  </button>
                                  <button
                                    onClick={() => {
                                      updateBookingStatus(booking.id, 'cancelled');
                                      setActiveDropdown(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Anulează
                                  </button>
                                </>
                              )}
                              
                              {(booking.status === 'scheduled' || booking.status === 'confirmed') && (
                                <button
                                  onClick={() => {
                                    updateBookingStatus(booking.id, 'complete');
                                    setActiveDropdown(null);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Marchează ca finalizat
                                </button>
                              )}
                              
                              <hr className="my-1" />
                              
                              <button
                                onClick={() => {
                                  deleteBooking(booking.id);
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                              >
                                <Trash2 className="w-4 h-4" />
                                Șterge
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                      <div className="mt-2 flex items-start gap-1 text-sm text-gray-500">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="italic">{booking.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Următor
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Afișare <span className="font-medium">{indexOfFirstItem + 1}</span> până la{' '}
                  <span className="font-medium">{Math.min(indexOfLastItem, filteredBookings.length)}</span> din{' '}
                  <span className="font-medium">{filteredBookings.length}</span> rezultate
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
}