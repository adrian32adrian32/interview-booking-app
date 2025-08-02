'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { Calendar, Clock, Plus, XCircle, MapPin, User, Phone, Mail } from 'lucide-react';

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
}

export default function BookingsPage() {
  const { t, language } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError(t('errors.notAuthenticated'));
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError(t('errors.sessionExpired'));
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to load bookings');
      }

      const data = await response.json();
      console.log('Bookings response:', data);
      
      if (data.success) {
        setBookings(data.bookings || []);
      } else {
        setError(data.message || t('errors.loadingBookings'));
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      setError(t('errors.loadingBookingsTryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!confirm(t('bookings.cancelConfirm'))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError(t('errors.notAuthenticated'));
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Actualizează lista locală fără a reîncărca de la server
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: 'cancelled' }
              : booking
          )
        );
        
        // Afișează mesaj de succes
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.textContent = t('bookings.bookingCancelledSuccess');
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
          successDiv.remove();
        }, 3000);
      } else {
        throw new Error(data.message || t('errors.cancellingBooking'));
      }
    } catch (error) {
      console.error('Error canceling booking:', error);
      
      // Afișează mesaj de eroare
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorDiv.textContent = error instanceof Error ? error.message : t('errors.cancellingBooking');
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        errorDiv.remove();
      }, 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      // Pentru date în format YYYY-MM-DD, adaugă ora locală
      const [year, month, day] = dateStr.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      
      // Folosește limba curentă pentru formatare
      const locale = language === 'ro' ? 'ro-RO' : 
                     language === 'en' ? 'en-US' : 
                     language === 'it' ? 'it-IT' :
                     language === 'fr' ? 'fr-FR' :
                     language === 'de' ? 'de-DE' :
                     language === 'es' ? 'es-ES' :
                     language === 'ru' ? 'ru-RU' :
                     language === 'uk' ? 'uk-UA' : 'en-US';
                     
      return date.toLocaleDateString(locale, options);
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      const locale = language === 'ro' ? 'ro-RO' : 
                     language === 'en' ? 'en-US' : 
                     language === 'it' ? 'it-IT' :
                     language === 'fr' ? 'fr-FR' :
                     language === 'de' ? 'de-DE' :
                     language === 'es' ? 'es-ES' :
                     language === 'ru' ? 'ru-RU' :
                     language === 'uk' ? 'uk-UA' : 'en-US';
      return date.toLocaleDateString(locale);
    } catch {
      return dateStr;
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
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingBookings = bookings.filter(b => {
    const [year, month, day] = b.interview_date.split('-');
    const bookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate >= today && b.status !== 'cancelled';
  });

  const pastBookings = bookings.filter(b => {
    const [year, month, day] = b.interview_date.split('-');
    const bookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate < today || b.status === 'cancelled';
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('bookings.myBookings')}
        </h1>
        <Link
          href="/booking"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('bookings.newBooking')}
        </Link>
      </div>

      {/* Programări viitoare */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('bookings.upcomingBookings')}
        </h2>
        {upcomingBookings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
            <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-400" />
            <p className="mb-2">{t('bookings.noUpcomingBookings')}</p>
            <Link
              href="/booking"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              {t('bookings.scheduleNow')} →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                          <User className="h-5 w-5 mr-2 text-gray-400" />
                          {booking.client_name}
                        </h3>
                        <div className="flex flex-col space-y-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            {booking.client_email}
                          </span>
                          <span className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {booking.client_phone}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                        ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {booking.status === 'confirmed' ? t('bookings.confirmed') : 
                         booking.status === 'pending' ? t('common.pending') : 
                         booking.status === 'cancelled' ? t('bookings.cancelled') : booking.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="text-sm font-medium">{formatDate(booking.interview_date)}</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <Clock className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="text-sm font-medium">{booking.interview_time}</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <MapPin className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="text-sm font-medium">
                          {booking.interview_type === 'online' ? t('common.online') : t('common.inPerson')}
                        </span>
                      </div>
                    </div>
                    
                    {booking.notes && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{t('common.notes')}:</span> {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {booking.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="ml-4 flex items-center px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t('bookings.cancelBooking')}
                    >
                      <XCircle className="h-5 w-5 mr-1" />
                      <span className="hidden sm:inline">{t('common.cancel')}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Istoric */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('bookings.bookingHistory')}
          </h2>
          <div className="space-y-3">
            {pastBookings.map((booking) => (
              <div key={booking.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow p-4 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">
                        {booking.client_name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${booking.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'}`}>
                        {booking.status === 'completed' ? t('bookings.finalized') : 
                         booking.status === 'cancelled' ? t('bookings.cancelled') : booking.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatShortDate(booking.interview_date)}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {booking.interview_time}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {booking.interview_type === 'online' ? t('common.online') : t('common.inPerson')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}