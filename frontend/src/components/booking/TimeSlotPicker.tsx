'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Clock, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from '@/lib/axios';
import { format, addDays, isSameDay, isWeekend, startOfToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isAfter, isBefore } from 'date-fns';
import { ro } from 'date-fns/locale';

interface TimeSlot {
  start: string;
  end: string;
  display: string;
}

interface TimeSlotPickerProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
}

export default function TimeSlotPicker({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange
}: TimeSlotPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  const today = startOfToday();
  const maxDate = addDays(today, 30); // Maximum 30 zile în avans

  // Generează zilele pentru luna curentă afișată
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Încarcă sloturile când se selectează o dată
  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchTimeSlots = async (date: Date) => {
    setLoading(true);
    setMessage(null);
    setTimeSlots([]);
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await axios.get(`/time-slots/available/${dateStr}`);
      
      if (response.data.success) {
        if (response.data.available) {
          setTimeSlots(response.data.slots);
          if (response.data.slots.length === 0) {
            setMessage('Nu mai sunt sloturi disponibile pentru această zi.');
          }
        } else {
          setMessage(response.data.reason || 'Această zi nu este disponibilă pentru programări.');
        }
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setMessage('Eroare la încărcarea sloturilor disponibile.');
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    return isWeekend(date) || 
           isBefore(date, today) || 
           isAfter(date, maxDate);
  };

  const getDayClassName = (date: Date) => {
    const baseClass = "p-2 sm:p-3 rounded-lg text-center transition-all ";
    
    if (!isSameMonth(date, currentMonth)) {
      return baseClass + "text-gray-300 dark:text-gray-700";
    }
    
    if (isSameDay(date, selectedDate || new Date(0))) {
      return baseClass + "bg-blue-600 text-white dark:bg-blue-500 cursor-pointer";
    }
    
    if (isDateDisabled(date)) {
      return baseClass + "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed";
    }
    
    return baseClass + "bg-white hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 cursor-pointer";
  };

  const handleDateClick = (date: Date) => {
    if (!isDateDisabled(date) && isSameMonth(date, currentMonth)) {
      onDateChange(date);
      onTimeChange(''); // Reset time când se schimbă data
    }
  };

  const handlePreviousMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    // Nu permite navigarea înapoi de luna curentă
    if (!isBefore(endOfMonth(prevMonth), today)) {
      setCurrentMonth(prevMonth);
    }
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    // Nu permite navigarea mai mult de 30 de zile în viitor
    if (!isAfter(startOfMonth(nextMonth), maxDate)) {
      setCurrentMonth(nextMonth);
    }
  };

  const getTimeSlotClassName = (slot: TimeSlot) => {
    const baseClass = "p-2 sm:p-3 rounded-lg text-center cursor-pointer transition-all text-sm sm:text-base ";
    
    if (slot.start === selectedTime) {
      return baseClass + "bg-blue-600 text-white dark:bg-blue-500";
    }
    
    return baseClass + "bg-white hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700";
  };

  // Calculează padding pentru prima săptămână
  const firstDayOfMonth = monthStart.getDay();
  const paddingDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  return (
    <div className="space-y-6">
      {/* Calendar pentru selectare dată */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Calendar className="inline h-4 w-4 mr-1" />
          Alege data interviului
        </label>
        
        {/* Header cu navigare */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), today)}
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {format(currentMonth, 'MMMM yyyy', { locale: ro })}
          </h3>
          
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isAfter(startOfMonth(addMonths(currentMonth, 1)), maxDate)}
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Header zile */}
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
            <div key={index} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 p-2">
              {day}
            </div>
          ))}
          
          {/* Padding pentru prima săptămână */}
          {Array.from({ length: paddingDays }).map((_, index) => (
            <div key={`pad-${index}`} />
          ))}
          
          {/* Zile din luna curentă */}
          {calendarDays.map((date) => (
            <div
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              className={getDayClassName(date)}
            >
              <div className="text-sm font-medium">{format(date, 'd')}</div>
            </div>
          ))}
        </div>
        
        {selectedDate && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Data selectată: <span className="font-semibold">{format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ro })}</span>
          </div>
        )}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <Clock className="inline h-4 w-4 mr-1" />
            Alege ora interviului
          </label>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : message ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="ml-3 text-sm text-yellow-800 dark:text-yellow-200">
                  {message}
                </p>
              </div>
            </div>
          ) : timeSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => onTimeChange(slot.start)}
                  className={getTimeSlotClassName(slot)}
                  type="button"
                >
                  {slot.display}
                </button>
              ))}
            </div>
          ) : null}
          
          {selectedTime && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Ora selectată: <span className="font-semibold">{selectedTime}</span>
            </div>
          )}
        </div>
      )}

      {/* Confirmare selecție */}
      {selectedDate && selectedTime && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Programare selectată:
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ro })} la ora {selectedTime}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}