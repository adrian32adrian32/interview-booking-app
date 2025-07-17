'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Plus, XCircle } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Booking {
  id: number;
  status: string;
  notes?: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await api.get('/bookings/my-bookings');
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Eroare la încărcarea programărilor');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!confirm('Ești sigur că vrei să anulezi această programare?')) {
      return;
    }

    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      toast.success('Programare anulată cu succes!');
      loadBookings();
    } catch (error) {
      toast.error('Eroare la anularea programării');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingBookings = bookings.filter(b => 
    new Date(b.date) >= new Date() && b.status !== 'cancelled'
  );
  const pastBookings = bookings.filter(b => 
    new Date(b.date) < new Date() || b.status === 'cancelled'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Programările mele
        </h1>
        <Link
          href="/bookings/new"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Programare nouă
        </Link>
      </div>

      {/* Programări viitoare */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Programări viitoare
        </h2>
        {upcomingBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            <Calendar className="mx-auto h-12 w-12 mb-4" />
            <p>Nu ai programări viitoare.</p>
            <Link
              href="/bookings/new"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Programează acum →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-4 text-lg font-medium">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-gray-600" />
                        {format(new Date(booking.date), 'EEEE, d MMMM yyyy', { locale: ro })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-gray-600" />
                        {booking.start_time} - {booking.end_time}
                      </div>
                    </div>
                    {booking.notes && (
                      <p className="mt-2 text-gray-600">Note: {booking.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancel(booking.id)}
                    className="flex items-center text-red-600 hover:text-red-800"
                  >
                    <XCircle className="h-5 w-5 mr-1" />
                    Anulează
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Istoric */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Istoric
          </h2>
          <div className="space-y-4">
            {pastBookings.map((booking) => (
              <div key={booking.id} className="bg-gray-50 rounded-lg shadow p-6 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">
                      {format(new Date(booking.date), 'dd/MM/yyyy')}
                    </span>
                    <span className="text-gray-600">
                      {booking.start_time} - {booking.end_time}
                    </span>
                    {booking.status === 'cancelled' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                        Anulat
                      </span>
                    )}
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