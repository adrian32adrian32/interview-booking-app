'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import Calendar from 'react-calendar';
import { format, addDays, isSameDay, isWeekend, isBefore, startOfDay, setHours, setMinutes } from 'date-fns';
import { ro } from 'date-fns/locale';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, User, Mail, 
  Phone, MapPin, FileText, Video, Save, Loader
} from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

// Schema de validare
const bookingSchema = z.object({
  candidate_name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere'),
  candidate_email: z.string().email('Email invalid'),
  candidate_phone: z.string().optional(),
  interview_type: z.enum(['technical', 'hr', 'behavioral', 'system_design', 'final']),
  notes: z.string().optional(),
  location: z.string().optional(),
  meeting_link: z.string().url('Link invalid').optional().or(z.literal('')),
  interviewer_id: z.string().optional(),
  duration: z.string()
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  interviewer_id: number;
  interviewer_name: string;
  available: boolean;
}

interface Interviewer {
  id: number;
  name: string;
  email: string;
}

export default function NewBookingPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      interview_type: 'technical',
      duration: '60'
    }
  });

  const selectedInterviewerId = watch('interviewer_id');
  const interviewType = watch('interview_type');

  useEffect(() => {
    fetchInterviewers();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, selectedInterviewerId, interviewType]);

  const fetchInterviewers = async () => {
    try {
      const response = await api.get('/users?role=interviewer');
      if (response.data.success) {
        setInterviewers(response.data.data.filter((user: any) => user.role === 'interviewer' || user.role === 'admin'));
      }
    } catch (error) {
      console.error('Error fetching interviewers:', error);
    }
  };

  const fetchAvailableSlots = async (date: Date) => {
    setLoadingSlots(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const params = new URLSearchParams({
        date: formattedDate,
        ...(selectedInterviewerId && { interviewer_id: selectedInterviewerId }),
        ...(interviewType && { interview_type: interviewType })
      });

      const response = await api.get(`/bookings/available-slots?${params}`);
      
      if (response.data.success) {
        setAvailableSlots(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Eroare la încărcarea sloturilor disponibile');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Generează sloturi locale dacă nu există în backend
  const generateDefaultSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 17;
    const slotDuration = 60; // minute

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        date: format(date, 'yyyy-MM-dd'),
        start_time: `${hour.toString().padStart(2, '0')}:00`,
        end_time: `${hour + 1}:00`,
        interviewer_id: 0,
        interviewer_name: 'Orice intervievator disponibil',
        available: true
      });
    }

    return slots;
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedSlot) {
      toast.error('Te rog selectează o dată și oră');
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingData = {
        ...data,
        booking_date: selectedSlot.date,
        start_time: selectedSlot.start_time,
        interviewer_id: selectedSlot.interviewer_id || data.interviewer_id,
        duration: parseInt(data.duration)
      };

      const response = await api.post('/bookings', bookingData);

      if (response.data.success) {
        toast.success('Programarea a fost creată cu succes!');
        
        // Trimite email de confirmare (opțional)
        try {
          await api.post('/bookings/send-confirmation', {
            booking_id: response.data.data.id
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }

        // Redirect după 1 secundă
        setTimeout(() => {
          router.push('/admin/bookings');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || 'Eroare la crearea programării');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disable dates în calendar
  const tileDisabled = ({ date }: { date: Date }) => {
    // Disable trecut
    if (isBefore(date, startOfDay(new Date()))) {
      return true;
    }
    
    // Disable weekend-uri
    if (isWeekend(date)) {
      return true;
    }

    // Disable specific dates
    return unavailableDates.some(unavailableDate => 
      isSameDay(date, unavailableDate)
    );
  };

  // Stil pentru zilele din calendar
  const tileClassName = ({ date }: { date: Date }) => {
    const classes = [];
    
    if (selectedDate && isSameDay(date, selectedDate)) {
      classes.push('selected-date');
    }
    
    if (isWeekend(date)) {
      classes.push('weekend');
    }
    
    return classes.join(' ');
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    if (slot.interviewer_id) {
      setValue('interviewer_id', slot.interviewer_id.toString());
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/bookings')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi la programări
        </button>
        
        <h1 className="text-2xl font-semibold text-gray-900">Programare Nouă</h1>
        <p className="mt-1 text-sm text-gray-600">
          Creează o nouă programare pentru interviu
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Date & Time Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Selectează Data și Ora
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Alege data</h3>
              <Calendar
                onChange={(value) => setSelectedDate(value as Date)}
                value={selectedDate}
                locale="ro-RO"
                minDate={new Date()}
                maxDate={addDays(new Date(), 60)}
                tileDisabled={tileDisabled}
                tileClassName={tileClassName}
                className="react-calendar-custom"
              />
            </div>

            {/* Time Slots */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {selectedDate ? `Ore disponibile pentru ${format(selectedDate, 'dd MMMM yyyy', { locale: ro })}` : 'Selectează o dată'}
              </h3>
              
              {loadingSlots ? (
                <div className="flex items-center justify-center h-64">
                  <Loader className="animate-spin h-8 w-8 text-blue-600" />
                </div>
              ) : selectedDate ? (
                <div className="max-h-96 overflow-y-auto">
                  {availableSlots.length === 0 ? (
                    // Generează sloturi default dacă nu există
                    <div className="grid grid-cols-2 gap-2">
                      {generateDefaultSlots(selectedDate).map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          className={`
                            p-3 rounded-lg border-2 transition-all text-sm
                            ${selectedSlot === slot
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="font-medium">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          disabled={!slot.available}
                          className={`
                            p-3 rounded-lg border-2 transition-all text-sm
                            ${slot.available 
                              ? selectedSlot === slot
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                              : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          <div className="font-medium">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          {slot.interviewer_name && (
                            <div className="text-xs mt-1">
                              {slot.interviewer_name}
                            </div>
                          )}
                          {!slot.available && (
                            <div className="text-xs text-red-500 mt-1">
                              Ocupat
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Selectează o dată pentru a vedea orele disponibile
                </div>
              )}
            </div>
          </div>

          {/* Selected Slot Display */}
          {selectedSlot && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Slot selectat:</h3>
              <div className="text-blue-700 space-y-1">
                <p className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {format(new Date(selectedSlot.date), 'EEEE, dd MMMM yyyy', { locale: ro })}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {selectedSlot.start_time} - {selectedSlot.end_time}
                </p>
                {selectedSlot.interviewer_name && (
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedSlot.interviewer_name}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Candidate Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Informații Candidat
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nume Complet *
              </label>
              <input
                type="text"
                {...register('candidate_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Ion Popescu"
              />
              {errors.candidate_name && (
                <p className="mt-1 text-sm text-red-600">{errors.candidate_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  {...register('candidate_email')}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="candidat@example.com"
                />
              </div>
              {errors.candidate_email && (
                <p className="mt-1 text-sm text-red-600">{errors.candidate_email.message}</p>
              )}
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  {...register('candidate_phone')}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+40 7XX XXX XXX"
                />
              </div>
            </div>

            {/* Tip Interviu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tip Interviu *
              </label>
              <select
                {...register('interview_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="technical">Tehnic</option>
                <option value="hr">HR</option>
                <option value="behavioral">Behavioral</option>
                <option value="system_design">System Design</option>
                <option value="final">Final</option>
              </select>
            </div>
          </div>
        </div>

        {/* Interview Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Detalii Interviu</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interviewer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervievator
              </label>
              <select
                {...register('interviewer_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selectează intervievator (opțional)</option>
                {interviewers.map(interviewer => (
                  <option key={interviewer.id} value={interviewer.id}>
                    {interviewer.name} - {interviewer.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Durată */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durată (minute)
              </label>
              <select
                {...register('duration')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30">30 minute</option>
                <option value="45">45 minute</option>
                <option value="60">60 minute</option>
                <option value="90">90 minute</option>
                <option value="120">120 minute</option>
              </select>
            </div>

            {/* Locație */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Locație
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  {...register('location')}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Sala 201, Etaj 2"
                />
              </div>
            </div>

            {/* Meeting Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Meet/Zoom
              </label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="url"
                  {...register('meeting_link')}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://meet.google.com/..."
                />
              </div>
              {errors.meeting_link && (
                <p className="mt-1 text-sm text-red-600">{errors.meeting_link.message}</p>
              )}
            </div>

            {/* Note - full width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Informații adiționale despre candidat sau interviu..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/bookings')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedSlot}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin w-4 h-4" />
                Se creează...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Creează Programare
              </>
            )}
          </button>
        </div>
      </form>

      <style jsx global>{`
        .react-calendar-custom {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem;
          font-family: inherit;
        }
        
        .react-calendar__tile {
          height: 40px;
          font-size: 0.875rem;
        }
        
        .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white !important;
        }
        
        .react-calendar__tile--active:hover {
          background: #2563eb !important;
        }
        
        .react-calendar__tile.weekend {
          color: #ef4444;
        }
        
        .react-calendar__tile:disabled {
          cursor: not-allowed;
          opacity: 0.5;
          background-color: #f3f4f6;
        }
        
        .react-calendar__navigation button {
          font-size: 1rem;
          color: #1f2937;
        }
        
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}