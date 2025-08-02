'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';
import { toastService } from '@/services/toastService';
import { format } from 'date-fns';
import { ro, enUS } from 'date-fns/locale';

interface TimeSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  available_spots: number;
}

export default function NewBookingPage() {
  const { t, language } = useLanguage();
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
      toastService.error('error.generic', t('bookings.error.loadingSlots'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      toastService.error('error.generic', t('bookings.error.selectSlot'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/bookings/create', {
        slotId: selectedSlot,
        notes
      });
      
      toastService.success('success.generic', t('bookings.success.created'));
      router.push('/bookings');
    } catch (error: any) {
      const message = error.response?.data?.message || t('bookings.error.creating');
      toastService.error('error.generic', message);
    } finally {
      setLoading(false);
    }
  };

  const getSpotsText = (spots: number) => {
    if (spots === 1) {
      return `1 ${t('bookings.new.spot')} ${language === 'ro' ? 'disponibil' : 'available'}`;
    }
    return `${spots} ${t('bookings.new.availableSpots')}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('bookings.new.title')}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selectare dată */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="inline-block w-5 h-5 mr-2" />
            {t('bookings.new.selectDate')}
          </label>
          <input
            type="date"
            min={minDate}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Sloturi disponibile */}
        {selectedDate && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              <Clock className="inline-block w-5 h-5 mr-2" />
              {t('bookings.new.selectTime')}
            </label>
            
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p>{t('bookings.new.noSlotsAvailable')}</p>
                <p className="text-sm mt-2">{t('bookings.new.selectAnotherDate')}</p>
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
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {slot.start_time} - {slot.end_time}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {getSpotsText(slot.available_spots)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Note opționale */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('bookings.new.additionalNotes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('bookings.new.notesPlaceholder')}
          />
        </div>

        {/* Butoane */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('bookings.new.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !selectedSlot}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('bookings.new.processing') : t('bookings.new.confirm')}
          </button>
        </div>
      </form>
    </div>
  );
}
