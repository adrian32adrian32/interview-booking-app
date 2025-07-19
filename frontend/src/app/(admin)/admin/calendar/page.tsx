'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  getDay, isSameMonth, isSameDay, addMonths, subMonths,
  isToday, isPast, isFuture, parseISO
} from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock,
  Video, MapPin, User, Filter, Download, Eye,
  AlertCircle, CheckCircle, XCircle, RefreshCw,
  CalendarDays, List, Grid3X3
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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  bookingId?: number;
}

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  useEffect(() => {
    fetchBookings();
  }, [currentDate]);

  useEffect(() => {
    if (selectedDate) {
      fetchDayDetails(selectedDate);
    }
  }, [selectedDate, bookings]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      setBookings(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Eroare la încărcarea programărilor');
    } finally {
      setLoading(false);
    }
  };

  const fetchDayDetails = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.interview_date.startsWith(dateStr));
    setDayBookings(dayBookings);

    // Calculează sloturile disponibile
    const bookedTimes = dayBookings.map(b => b.interview_time);
    const slots = timeSlots.map(time => ({
      time,
      available: !bookedTimes.includes(time),
      bookingId: dayBookings.find(b => b.interview_time === time)?.id
    }));
    setAvailableSlots(slots);
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => b.interview_date.startsWith(dateStr));
  };

  const getBookingStats = (bookingsList: Booking[]) => {
    return {
      total: bookingsList.length,
      confirmed: bookingsList.filter(b => b.status === 'confirmed').length,
      pending: bookingsList.filter(b => b.status === 'pending').length,
      cancelled: bookingsList.filter(b => b.status === 'cancelled').length
    };
  };

  const getDayClass = (date: Date) => {
    const baseClass = "relative h-24 p-2 border border-gray-200 transition-all cursor-pointer ";
    const dayBookings = getBookingsForDate(date);
    
    if (!isSameMonth(date, currentDate)) {
      return baseClass + "bg-gray-50 text-gray-400";
    }
    
    if (isToday(date)) {
      return baseClass + "bg-blue-50 border-blue-300";
    }
    
    if (isPast(date) && !isToday(date)) {
      return baseClass + "bg-gray-50";
    }
    
    if (dayBookings.length > 0) {
      const hasPending = dayBookings.some(b => b.status === 'pending');
      if (hasPending) {
        return baseClass + "bg-yellow-50 border-yellow-300";
      }
      return baseClass + "bg-green-50 border-green-300";
    }
    
    return baseClass + "bg-white hover:bg-gray-50";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayDetails(true);
  };

  const handleQuickAction = (action: string, bookingId?: number) => {
    switch (action) {
      case 'new':
        router.push(`/admin/bookings/new?date=${format(selectedDate!, 'yyyy-MM-dd')}`);
        break;
      case 'view':
        if (bookingId) router.push(`/admin/bookings/${bookingId}`);
        break;
      case 'edit':
        if (bookingId) router.push(`/admin/bookings/${bookingId}/edit`);
        break;
    }
  };

  const exportCalendar = () => {
    const monthBookings = bookings.filter(b => {
      const bookingDate = parseISO(b.interview_date);
      return isSameMonth(bookingDate, currentDate);
    });

    const csv = [
      ['Data', 'Ora', 'Client', 'Email', 'Telefon', 'Tip', 'Status'],
      ...monthBookings.map(b => [
        format(parseISO(b.interview_date), 'dd.MM.yyyy'),
        b.interview_time,
        b.client_name,
        b.client_email,
        b.client_phone,
        b.interview_type === 'online' ? 'Online' : 'În persoană',
        b.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-${format(currentDate, 'yyyy-MM')}.csv`;
    a.click();
    toast.success('Calendar exportat cu succes!');
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Adaugă zile din luna anterioară pentru a completa săptămâna
    const startDay = getDay(monthStart);
    const previousMonthDays = [];
    if (startDay !== 1) {
      const daysToAdd = startDay === 0 ? 6 : startDay - 1;
      for (let i = daysToAdd; i > 0; i--) {
        previousMonthDays.push(subMonths(monthStart, 1));
      }
    }

    const allDays = [...previousMonthDays, ...days];

    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="grid grid-cols-7 gap-0 border-b">
          {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0">
          {allDays.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            const stats = getBookingStats(dayBookings);
            
            return (
              <div
                key={index}
                className={getDayClass(date)}
                onClick={() => handleDateClick(date)}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : ''}`}>
                    {format(date, 'd')}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-xs bg-gray-800 text-white px-1.5 py-0.5 rounded-full">
                      {dayBookings.length}
                    </span>
                  )}
                </div>
                
                {dayBookings.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {dayBookings.slice(0, 2).map((booking, idx) => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded ${getStatusColor(booking.status)} text-white truncate`}
                      >
                        {booking.interview_time} - {booking.client_name.split(' ')[0]}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayBookings.length - 2} altele
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayDetails = () => {
    if (!selectedDate || !showDayDetails) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ro })}
              </h2>
              <button
                onClick={() => setShowDayDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                {dayBookings.filter(b => b.status === 'confirmed').length} confirmate
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                {dayBookings.filter(b => b.status === 'pending').length} în așteptare
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                {availableSlots.filter(s => s.available).length} sloturi libere
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Program zi</h3>
              <button
                onClick={() => handleQuickAction('new')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Adaugă programare
              </button>
            </div>

            <div className="space-y-2">
              {timeSlots.map(time => {
                const slot = availableSlots.find(s => s.time === time);
                const booking = dayBookings.find(b => b.interview_time === time);
                
                return (
                  <div
                    key={time}
                    className={`flex items-center p-3 rounded-lg border ${
                      booking ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="w-20 text-sm font-medium text-gray-600">
                      {time}
                    </div>
                    
                    {booking ? (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{booking.client_name}</p>
                            <p className="text-sm text-gray-500">{booking.client_email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {booking.interview_type === 'online' ? (
                              <Video className="h-4 w-4 text-blue-500" />
                            ) : (
                              <MapPin className="h-4 w-4 text-green-500" />
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {booking.status === 'confirmed' ? 'Confirmat' :
                               booking.status === 'pending' ? 'În așteptare' : 'Anulat'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuickAction('view', booking.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Slot disponibil</span>
                        <button
                          onClick={() => handleQuickAction('new')}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Rezervă
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar Programări</h1>
          <p className="text-sm text-gray-600 mt-1">
            Vizualizează și gestionează toate programările
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchBookings()}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </button>
          <button
            onClick={exportCalendar}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => router.push('/admin/bookings/new')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Programare nouă
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: ro })}
            </h2>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Astăzi
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'month' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="Vizualizare lunară"
            >
              <Grid3X3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'week' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="Vizualizare săptămânală"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'day' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="Vizualizare zilnică"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'month' && renderMonthView()}
      
      {/* Day Details Modal */}
      {renderDayDetails()}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total luna aceasta</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter(b => {
                  const bookingDate = parseISO(b.interview_date);
                  return isSameMonth(bookingDate, currentDate);
                }).length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Confirmate</p>
              <p className="text-2xl font-bold text-green-600">
                {bookings.filter(b => {
                  const bookingDate = parseISO(b.interview_date);
                  return isSameMonth(bookingDate, currentDate) && b.status === 'confirmed';
                }).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">În așteptare</p>
              <p className="text-2xl font-bold text-yellow-600">
                {bookings.filter(b => {
                  const bookingDate = parseISO(b.interview_date);
                  return isSameMonth(bookingDate, currentDate) && b.status === 'pending';
                }).length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Anulate</p>
              <p className="text-2xl font-bold text-red-600">
                {bookings.filter(b => {
                  const bookingDate = parseISO(b.interview_date);
                  return isSameMonth(bookingDate, currentDate) && b.status === 'cancelled';
                }).length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
}