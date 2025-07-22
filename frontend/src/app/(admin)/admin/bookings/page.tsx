'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
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
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const searchParams = useSearchParams();
  const userEmail = searchParams.get('user_email');

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, typeFilter, dateFilter]);

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
      toast.error('Eroare la încărcarea programărilor');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
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

    setFilteredBookings(filtered);
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

      toast.success(`Programare ${status === 'confirmed' ? 'confirmată' : 'anulată'} cu succes`);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Eroare la actualizarea programării');
    }
  };

  const deleteBooking = async (id: number) => {
    if (!confirm('Ești sigur că vrei să ștergi această programare?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete booking');

      toast.success('Programare ștearsă cu succes');
      fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Eroare la ștergerea programării');
    }
  };

  const exportBookings = () => {
    const csv = [
      ['ID', 'Nume', 'Email', 'Telefon', 'Data', 'Ora', 'Tip', 'Status', 'Note', 'Creat la'],
      ...filteredBookings.map(b => [
        b.id,
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
    a.download = `programari-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          Gestionare Programări
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/bookings/new')}
            className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Programare Nouă
          </button>
          <button
            onClick={exportBookings}
            className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 futuristic:bg-green-600 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 futuristic:hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 p-4 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 space-y-4 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
            <input
              type="text"
              placeholder="Caută după nume, email, telefon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 placeholder-gray-500 dark:placeholder-gray-400 futuristic:placeholder-cyan-300/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
          >
            <option value="all">Toate statusurile</option>
            <option value="pending">În așteptare</option>
            <option value="confirmed">Confirmate</option>
            <option value="cancelled">Anulate</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
          >
            <option value="all">Toate tipurile</option>
            <option value="online">Online</option>
            <option value="in_person">În persoană</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400"
          >
            <option value="all">Toate datele</option>
            <option value="today">Astăzi</option>
            <option value="week">Săptămâna aceasta</option>
            <option value="month">Luna aceasta</option>
          </select>

          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">
            <Filter className="h-4 w-4 mr-2" />
            {filteredBookings.length} din {bookings.length} programări
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 overflow-hidden border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 futuristic:divide-purple-500/30">
            <thead className="bg-gray-50 dark:bg-gray-900 futuristic:bg-purple-900/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  Data & Ora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  Documente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 divide-y divide-gray-200 dark:divide-gray-700 futuristic:divide-purple-500/20">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 futuristic:hover:bg-purple-800/20 transition-colors">
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
                        {format(new Date(booking.interview_date), 'dd MMM yyyy', { locale: ro })}
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
                          Online
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 futuristic:text-green-400" />
                          În persoană
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span className="ml-1">
                        {booking.status === 'pending' && 'În așteptare'}
                        {booking.status === 'confirmed' && 'Confirmat'}
                        {booking.status === 'cancelled' && 'Anulat'}
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
                            title="Confirmă"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="text-red-600 dark:text-red-400 futuristic:text-red-400 hover:text-red-900 dark:hover:text-red-300 futuristic:hover:text-red-300"
                            title="Anulează"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => router.push(`/admin/bookings/${booking.id}/edit`)}
                        className="text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-900 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
                        title="Vezi detalii"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteBooking(booking.id)}
                        className="text-red-600 dark:text-red-400 futuristic:text-red-400 hover:text-red-900 dark:hover:text-red-300 futuristic:hover:text-red-300"
                        title="Șterge"
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

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
              Nu există programări
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all'
                ? 'Nu s-au găsit programări conform filtrelor selectate.'
                : 'Nu există încă programări înregistrate.'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && dateFilter === 'all' && (
              <button
                onClick={() => router.push('/admin/bookings/new')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adaugă prima programare
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}