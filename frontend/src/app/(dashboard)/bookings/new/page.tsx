'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface TimeSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  available_spots: number;
}

export default function NewBookingPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Setează data minimă la mâine
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadAvailableSlots = async () => {
    try {
      const response = await api.get(`/bookings/available-slots?date=${selectedDate}`);
      setAvailableSlots(response.data.data || []);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Error loading slots:', error);
      toast.error('Eroare la încărcarea sloturilor disponibile');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      toast.error('Te rugăm să selectezi un slot!');
      return;
    }

    setLoading(true);
    try {
      await api.post('/bookings/create', {
        slotId: selectedSlot,
        notes
      });
      
      toast.success('Programare creată cu succes!');
      router.push('/bookings');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Eroare la creare programare';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Programează un interviu
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selectare dată */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline-block w-5 h-5 mr-2" />
            Alege data
          </label>
          <input
            type="date"
            min={minDate}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Sloturi disponibile */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              <Clock className="inline-block w-5 h-5 mr-2" />
              Alege ora
            </label>
            
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p>Nu există sloturi disponibile pentru această dată.</p>
                <p className="text-sm mt-2">Te rugăm să alegi altă dată.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedSlot === slot.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">
                      {slot.start_time} - {slot.end_time}
                    </div>
                    <div className="text-sm text-gray-500">
                      {slot.available_spots} locuri disponibile
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Note opționale */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note adiționale (opțional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Adaugă orice informații relevante..."
          />
        </div>

        {/* Butoane */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={loading || !selectedSlot}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Se procesează...' : 'Confirmă programarea'}
          </button>
        </div>
      </form>
    </div>
  );
}