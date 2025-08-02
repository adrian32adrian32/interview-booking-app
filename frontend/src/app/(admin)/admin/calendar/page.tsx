'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  getDay, isSameMonth, isSameDay, addMonths, subMonths,
  isToday, isPast, isFuture, parseISO, startOfWeek, 
  endOfWeek, addDays, isAfter, isBefore
} from 'date-fns';
import { ro, enUS, es, fr, de, it, ru, uk } from 'date-fns/locale';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock,
  Video, MapPin, User, Filter, Download, Eye,
  AlertCircle, CheckCircle, XCircle, RefreshCw,
  CalendarDays, List, Grid3X3, Move, X,
  ChevronUp, ChevronDown, CalendarIcon, Edit,
  MoreVertical, Maximize2, Trash2
} from 'lucide-react';
import { toastService } from '@/services/toastService';

interface Booking {
  id: number;
  booking_id?: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  interview_date: string;
  interview_time: string;
  interview_type: 'online' | 'in_person' | 'onsite';
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
  const { t, language } = useLanguage();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  // State-uri pentru drag & drop
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetMonth, setTargetMonth] = useState<Date | null>(null);

  // State pentru navigare rapidă
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  // State pentru editare în calendar
  const [editMode, setEditMode] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // State pentru modal reprogramare
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{
    booking: Booking;
    newDate: Date;
    sendEmail: boolean;
  } | null>(null);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  // Funcție pentru a obține locale-ul corect pentru date-fns
  const getLocale = () => {
    switch (language) {
      case 'ro': return ro;
      case 'es': return es;
      case 'fr': return fr;
      case 'de': return de;
      case 'it': return it;
      case 'ru': return ru;
      case 'uk': return uk;
      default: return enUS;
    }
  };

  // Funcție corectată pentru zilele săptămânii
  const getWeekDays = () => {
    const locale = getLocale();
    const days = [];
    const baseDate = new Date(2024, 0, 1); // 1 Ianuarie 2024 - este o Luni
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      days.push(format(date, 'EEE', { locale }));
    }
    return days;
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDayDetails(selectedDate);
    }
  }, [selectedDate, bookings]);

  // Auto-scroll când se trage spre margini
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const threshold = 100;
      const scrollSpeed = 5;
      
      if (e.clientX < threshold) {
        // Scroll spre stânga (luna anterioară)
        setCurrentDate(prev => subMonths(prev, 1));
      } else if (e.clientX > window.innerWidth - threshold) {
        // Scroll spre dreapta (luna următoare)
        setCurrentDate(prev => addMonths(prev, 1));
      }
    };

    const interval = setInterval(() => {
      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      setBookings(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toastService.error(t('error.loadingBookings'));
    } finally {
      setLoading(false);
    }
  };

  const fetchDayDetails = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => {
      const bookingDate = b.interview_date.split('T')[0];
      return bookingDate === dateStr;
    });
    setDayBookings(dayBookings);

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
    return bookings.filter(b => {
      const bookingDate = b.interview_date.split('T')[0];
      return bookingDate === dateStr;
    });
  };

  const toggleDayExpansion = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDays(newExpanded);
  };

  // Funcție helper pentru a obține ID-ul corect
  const getBookingId = (booking: Booking): number => {
    return booking.booking_id || booking.id;
  };

  // Handler pentru începutul drag
  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    e.stopPropagation();
    setDraggedBooking(booking);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', getBookingId(booking).toString());
    
    // Activează automat modul editare
    setEditMode(true);
    toastService.info(t('calendar.dragInstruction'));
  };

  // Handler pentru sfârșit drag
  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    setDraggedBooking(null);
    setDragOverDate(null);
    setTargetMonth(null);
  };

  // Handler pentru drag over
  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedBooking || !editMode) return;
    
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
    
    // Dacă data este într-o altă lună, navighează automat
    if (!isSameMonth(date, currentDate)) {
      setTargetMonth(date);
      setCurrentDate(startOfMonth(date));
    }
  };

  // Handler pentru drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverDate(null);
  };

  // Handler pentru drop
  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);
    setIsDragging(false);
    
    if (!draggedBooking || !editMode) return;
    
    const newDateStr = format(date, 'yyyy-MM-dd');
    
    // Verificări doar pentru weekend (nu pentru trecut în modul editare)
    if (date.getDay() === 0 || date.getDay() === 6) {
      toastService.error(t('calendar.noWeekend'));
      setDraggedBooking(null);
      return;
    }
    
    // Dacă e aceeași dată, nu face nimic
    if (draggedBooking.interview_date.split('T')[0] === newDateStr) {
      setDraggedBooking(null);
      return;
    }
    
    // Deschide modal pentru confirmare și opțiuni
    setRescheduleData({
      booking: draggedBooking,
      newDate: date,
      sendEmail: true
    });
    setShowRescheduleModal(true);
    setDraggedBooking(null);
  };

  // Handler pentru confirmarea reprogramării
  const handleConfirmReschedule = async () => {
    if (!rescheduleData) return;

    const { booking, newDate, sendEmail } = rescheduleData;
    const newDateStr = format(newDate, 'yyyy-MM-dd');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${getBookingId(booking)}/reschedule`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interview_date: newDateStr,
          interview_time: booking.interview_time,
          status: booking.status,
          send_email: sendEmail,
          old_date: format(parseISO(booking.interview_date), 'dd.MM.yyyy'),
          old_time: booking.interview_time,
          client_email: booking.client_email,
          client_name: booking.client_name
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (sendEmail) {
          toastService.success(`${t('calendar.bookingMovedSuccess')}! ${t('calendar.emailSentTo')} ${booking.client_email}`);
        } else {
          toastService.success(t('calendar.bookingMovedSuccess'));
        }
        await fetchBookings();
        setShowRescheduleModal(false);
        setRescheduleData(null);
      } else {
        const data = await response.json();
        toastService.error(data.message || t('calendar.errorMovingBooking'));
      }
    } catch (error) {
      console.error('Error rescheduling:', error);
      toastService.error(t('calendar.errorMovingBooking'));
    }
  };

  // Anulează drag-ul când se apasă ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragging) {
        setIsDragging(false);
        setDraggedBooking(null);
        setDragOverDate(null);
        toastService.info(t('calendar.moveCancelled'));
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDragging, t]);

  const getDayClass = (date: Date) => {
    const baseClass = "relative min-h-[160px] p-2 border transition-all ";
    const dayBookings = getBookingsForDate(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isPastDate = isPast(date) && !isToday(date);
    const dateKey = format(date, 'yyyy-MM-dd');
    const isExpanded = expandedDays.has(dateKey);
    
    // Adaugă clasă pentru cursor în funcție de starea drag
    const cursorClass = isDragging && !isWeekend && (editMode || !isPastDate) ? "cursor-copy " : "cursor-pointer ";
    
    // Adaugă height pentru zilele extinse
    const heightClass = isExpanded ? "h-auto " : "h-40 ";
    
    // Adaugă highlight pentru drag over
    if (dragOverDate && format(dragOverDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
      return baseClass + heightClass + cursorClass + "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/30 futuristic:bg-cyan-500/20 scale-105";
    }
    
    if (!isSameMonth(date, currentDate)) {
      return baseClass + heightClass + cursorClass + "bg-gray-50 dark:bg-gray-900 futuristic:bg-gray-950/50 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 futuristic:border-cyan-500/10";
    }
    
    if (isToday(date)) {
      return baseClass + heightClass + cursorClass + "bg-blue-50 dark:bg-blue-900/20 futuristic:bg-cyan-500/10 border-blue-300 dark:border-blue-600 futuristic:border-cyan-400 futuristic:shadow-[0_0_15px_rgba(6,182,212,0.3)]";
    }
    
    if (isWeekend) {
      return baseClass + heightClass + "cursor-not-allowed bg-gray-100 dark:bg-gray-900/70 futuristic:bg-gray-950/50 border-gray-300 dark:border-gray-700 futuristic:border-cyan-500/10";
    }
    
    if (isPastDate && !editMode) {
      return baseClass + heightClass + "cursor-not-allowed bg-gray-50 dark:bg-gray-900/50 futuristic:bg-gray-950/30 border-gray-200 dark:border-gray-700 futuristic:border-cyan-500/10";
    }
    
    if (dayBookings.length > 0) {
      const hasPending = dayBookings.some(b => b.status === 'pending');
      if (hasPending) {
        return baseClass + heightClass + cursorClass + "bg-yellow-50 dark:bg-yellow-900/20 futuristic:bg-yellow-500/10 border-yellow-300 dark:border-yellow-600 futuristic:border-yellow-400";
      }
      return baseClass + heightClass + cursorClass + "bg-green-50 dark:bg-green-900/20 futuristic:bg-green-500/10 border-green-300 dark:border-green-600 futuristic:border-green-400";
    }
    
    return baseClass + heightClass + cursorClass + "bg-white dark:bg-gray-800 futuristic:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-cyan-500/5 border-gray-200 dark:border-gray-700 futuristic:border-cyan-500/20";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 dark:bg-green-600 futuristic:bg-green-400';
      case 'pending': return 'bg-yellow-500 dark:bg-yellow-600 futuristic:bg-yellow-400';
      case 'cancelled': return 'bg-red-500 dark:bg-red-600 futuristic:bg-red-400';
      case 'completed': return 'bg-gray-500 dark:bg-gray-600 futuristic:bg-gray-400';
      default: return 'bg-blue-500 dark:bg-blue-600 futuristic:bg-blue-400';
    }
  };

  const handleDateClick = (date: Date) => {
    if (isDragging) return;
    
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
      case 'delete':
        if (bookingId && confirm(t('calendar.confirmDelete'))) {
          handleDeleteBooking(bookingId);
        }
        break;
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toastService.success(t('calendar.bookingDeletedSuccess'));
        await fetchBookings();
        if (showDayDetails) {
          setShowDayDetails(false);
        }
      } else {
        toastService.error(t('error.deleteBooking'));
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      toastService.error(t('error.deleteBooking'));
    }
  };

  const exportCalendar = () => {
    const monthBookings = bookings.filter(b => {
      const bookingDate = parseISO(b.interview_date);
      return isSameMonth(bookingDate, currentDate);
    });

    const csv = [
      [t('common.date'), t('common.time'), t('common.client'), t('common.email'), t('common.phone'), t('common.type'), t('common.status')],
      ...monthBookings.map(b => [
        format(parseISO(b.interview_date), 'dd.MM.yyyy'),
        b.interview_time,
        b.client_name,
        b.client_email,
        b.client_phone,
        b.interview_type === 'online' ? t('common.online') : t('common.inPerson'),
        t(`bookings.${b.status}`)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-${format(currentDate, 'yyyy-MM')}.csv`;
    a.click();
    toastService.success(t('calendar.calendarExportedSuccess'));
  };

  const goToDate = (date: Date) => {
    setCurrentDate(date);
    setShowMonthPicker(false);
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = getWeekDays();

    return (
      <div className="bg-white dark:bg-gray-800 futuristic:bg-gray-900/80 futuristic:backdrop-blur-xl futuristic:border futuristic:border-cyan-500/20 rounded-lg shadow-sm">
        {/* Indicator pentru drag & drop */}
        {isDragging && draggedBooking && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 futuristic:bg-cyan-500/20 border border-blue-200 dark:border-blue-700 futuristic:border-cyan-500/30 rounded-lg mx-4 mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <Move className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-200 futuristic:text-cyan-300">
                {t('calendar.movingBookingOf')} <strong className="mx-1">{draggedBooking.client_name}</strong> 
                - {t('calendar.placeOnAvailableDay')}
              </span>
            </div>
            <button
              onClick={() => {
                setIsDragging(false);
                setDraggedBooking(null);
                setDragOverDate(null);
              }}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Toggle Edit Mode */}
        <div className="flex justify-between items-center px-4 pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                editMode 
                  ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Edit className="w-4 h-4" />
              {editMode ? t('calendar.editModeActive') : t('calendar.activateEdit')}
            </button>
            {editMode && (
              <span className="text-xs text-orange-600 dark:text-orange-400">
                {t('calendar.canMovePast')}
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-0 border-b dark:border-gray-700 futuristic:border-cyan-500/20 mt-4">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-300 border-r dark:border-gray-700 futuristic:border-cyan-500/20 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-0">
          {days.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isPastDate = isPast(date) && !isToday(date);
            const canDrop = !isWeekend && (editMode || !isPastDate);
            const dateKey = format(date, 'yyyy-MM-dd');
            const isExpanded = expandedDays.has(dateKey);
            const displayBookings = isExpanded ? dayBookings : dayBookings.slice(0, 3);
            
            return (
              <div
                key={index}
                className={getDayClass(date)}
                onClick={() => !isDragging && handleDateClick(date)}
                onDragOver={(e) => canDrop && handleDragOver(e, date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => canDrop && handleDrop(e, date)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${
                    isToday(date) 
                      ? 'text-blue-600 dark:text-blue-400 futuristic:text-cyan-400' 
                      : isWeekend
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'dark:text-gray-200'
                  }`}>
                    {format(date, 'd')}
                  </span>
                  <div className="flex items-center gap-1">
                    {dayBookings.length > 0 && (
                      <span className="text-xs bg-gray-800 dark:bg-gray-700 futuristic:bg-cyan-500/20 text-white px-1.5 py-0.5 rounded-full">
                        {dayBookings.length}
                      </span>
                    )}
                    {dayBookings.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDayExpansion(date);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        title={isExpanded ? t('calendar.collapse') : t('calendar.viewAll')}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className={`space-y-1 ${isExpanded ? '' : 'overflow-hidden max-h-32'}`}>
                  {displayBookings.map((booking, idx) => {
                    const canDrag = (booking.status !== 'cancelled' && booking.status !== 'completed') || editMode;
                    const bookingId = getBookingId(booking);
                    
                    return (
                      <div
                        key={bookingId}
                        draggable={canDrag}
                        onDragStart={(e) => canDrag && handleDragStart(e, booking)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAction('edit', bookingId);
                        }}
                        className={`text-xs p-1 rounded ${getStatusColor(booking.status)} text-white truncate ${
                          canDrag 
                            ? 'cursor-move hover:opacity-80 hover:scale-105' 
                            : 'cursor-pointer'
                        } transition-all ${
                          isDragging && draggedBooking && getBookingId(draggedBooking) === bookingId ? 'opacity-50' : ''
                        }`}
                        title={`${booking.client_name} - ${booking.interview_time} - ${t('calendar.clickToEdit')}`}
                      >
                        {booking.interview_time.substring(0, 5)} - {booking.client_name.split(' ')[0]}
                      </div>
                    );
                  })}
                  {!isExpanded && dayBookings.length > 3 && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDayExpansion(date);
                      }}
                      className="text-xs text-gray-500 dark:text-gray-400 text-center cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      +{dayBookings.length - 3} {t('calendar.others')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legendă drag & drop */}
        <div className="p-4 border-t dark:border-gray-700 futuristic:border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 futuristic:text-cyan-400/70">
                <Move className="w-3 h-3" />
                <span>{t('calendar.dragDropReschedule')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Edit className="w-3 h-3" />
                <span>{t('calendar.clickBookingToEdit')}</span>
              </div>
              {isDragging && (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <ChevronLeft className="w-3 h-3" />
                  <span>{t('calendar.navigateMonthsArrows')}</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('calendar.escCancel')} | {t('calendar.clickOn')} <Maximize2 className="w-3 h-3 inline" /> {t('calendar.forAllBookings')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDayDetails = () => {
    if (!selectedDate || !showDayDetails) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 futuristic:bg-gray-900/95 futuristic:backdrop-blur-xl futuristic:border futuristic:border-cyan-500/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b dark:border-gray-700 futuristic:border-cyan-500/20">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white futuristic:text-cyan-300">
                {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: getLocale() })}
              </h2>
              <button
                onClick={() => setShowDayDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="dark:text-gray-300">{dayBookings.filter(b => b.status === 'confirmed').length} {t('calendar.confirmed')}</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="dark:text-gray-300">{dayBookings.filter(b => b.status === 'pending').length} {t('calendar.pending')}</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="dark:text-gray-300">{availableSlots.filter(s => s.available).length} {t('calendar.freeSlots')}</span>
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-300">{t('calendar.daySchedule')}</h3>
              <button
                onClick={() => handleQuickAction('new')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 futuristic:bg-cyan-500 futuristic:hover:bg-cyan-600"
              >
                <Plus className="h-4 w-4" />
                {t('calendar.addBooking')}
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {timeSlots.map(time => {
                const slot = availableSlots.find(s => s.time === time);
                const booking = dayBookings.find(b => b.interview_time === time);
                
                return (
                  <div
                    key={time}
                    className={`flex items-center p-3 rounded-lg border ${
                      booking 
                        ? 'bg-gray-50 dark:bg-gray-700/50 futuristic:bg-cyan-500/10 border-gray-300 dark:border-gray-600 futuristic:border-cyan-500/20' 
                        : 'bg-white dark:bg-gray-800 futuristic:bg-gray-900/50 border-gray-200 dark:border-gray-700 futuristic:border-cyan-500/10'
                    }`}
                  >
                    <div className="w-20 text-sm font-medium text-gray-600 dark:text-gray-400 futuristic:text-cyan-400">
                      {time}
                    </div>
                    
                    {booking ? (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-300">{booking.client_name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{booking.client_email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {booking.interview_type === 'online' ? (
                              <Video className="h-4 w-4 text-blue-500" />
                            ) : (
                              <MapPin className="h-4 w-4 text-green-500" />
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              booking.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' :
                              booking.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' :
                              'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                            }`}>
                              {t(`bookings.${booking.status}`)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuickAction('view', getBookingId(booking))}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            title={t('calendar.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleQuickAction('edit', getBookingId(booking))}
                            className="p-1 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
                            title={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleQuickAction('delete', getBookingId(booking))}
                            className="p-1 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-gray-400 dark:text-gray-500">{t('calendar.slotAvailable')}</span>
                        <button
                          onClick={() => handleQuickAction('new')}
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 futuristic:text-cyan-400 futuristic:hover:text-cyan-300"
                        >
                          {t('calendar.reserve')}
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

  const renderMonthPicker = () => {
    if (!showMonthPicker) return null;

    const currentYear = currentDate.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
    const months = Array.from({ length: 12 }, (_, i) => i);

    return (
      <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 futuristic:bg-gray-900/95 rounded-lg shadow-lg border dark:border-gray-700 futuristic:border-cyan-500/30 p-4 z-50">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {months.map(month => (
            <button
              key={month}
              onClick={() => goToDate(new Date(currentYear, month))}
              className={`px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                currentDate.getMonth() === month 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'dark:text-gray-300'
              }`}
            >
              {format(new Date(2000, month), 'MMM', { locale: getLocale() })}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {years.map(year => (
            <button
              key={year}
              onClick={() => goToDate(new Date(year, currentDate.getMonth()))}
              className={`px-3 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                currentYear === year 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'dark:text-gray-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderRescheduleModal = () => {
    if (!showRescheduleModal || !rescheduleData) return null;

    const { booking, newDate, sendEmail } = rescheduleData;
    const oldDateFormatted = format(parseISO(booking.interview_date), 'EEEE, d MMMM yyyy', { locale: getLocale() });
    const newDateFormatted = format(newDate, 'EEEE, d MMMM yyyy', { locale: getLocale() });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 futuristic:bg-gray-900/95 futuristic:backdrop-blur-xl futuristic:border futuristic:border-cyan-500/30 rounded-lg max-w-md w-full">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white futuristic:text-cyan-300">
              {t('calendar.confirmReschedule')}
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 futuristic:bg-cyan-500/10 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('common.client')}:</p>
                <p className="font-medium dark:text-white">{booking.client_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{booking.client_email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 futuristic:bg-red-500/10 p-3 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1">{t('calendar.oldDate')}:</p>
                  <p className="text-sm font-medium dark:text-white">{oldDateFormatted}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{booking.interview_time}</p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 futuristic:bg-green-500/10 p-3 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('calendar.newDate')}:</p>
                  <p className="text-sm font-medium dark:text-white">{newDateFormatted}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{booking.interview_time}</p>
                </div>
              </div>

              <div className="border-t dark:border-gray-700 futuristic:border-cyan-500/20 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rescheduleData.sendEmail}
                    onChange={(e) => setRescheduleData({
                      ...rescheduleData,
                      sendEmail: e.target.checked
                    })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div>
                    <p className="font-medium dark:text-white">{t('calendar.sendNotificationEmail')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('calendar.clientWillReceiveEmail')}
                    </p>
                  </div>
                </label>
              </div>

              {rescheduleData.sendEmail && (
                <div className="bg-blue-50 dark:bg-blue-900/20 futuristic:bg-cyan-500/10 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300 futuristic:text-cyan-300">
                    📧 {t('calendar.emailWillContain')}:
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-0.5 ml-4">
                    <li>• {t('calendar.newDateTime')}</li>
                    <li>• {t('calendar.confirmationLink')}</li>
                    <li>• {t('calendar.interviewTypeDetails')} ({booking.interview_type === 'online' ? t('common.online') : t('common.inPerson')})</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleConfirmReschedule}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 futuristic:bg-cyan-500 futuristic:hover:bg-cyan-600 transition-colors"
              >
                {t('calendar.confirmRescheduleBtn')}
              </button>
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleData(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white futuristic:text-cyan-300">{t('calendar.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-400/70 mt-1">
            {t('calendar.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchBookings()}
            className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 futuristic:bg-gray-900/80 border border-gray-300 dark:border-gray-600 futuristic:border-cyan-500/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-cyan-500/10 dark:text-white futuristic:text-cyan-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </button>
          <button
            onClick={exportCalendar}
            className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 futuristic:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 futuristic:hover:bg-green-600"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </button>
          <button
            onClick={() => router.push('/admin/bookings/new')}
            className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-cyan-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 futuristic:hover:bg-cyan-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('calendar.newBooking')}
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-gray-900/80 futuristic:backdrop-blur-xl futuristic:border futuristic:border-cyan-500/20 rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-cyan-500/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 dark:text-gray-300 futuristic:text-cyan-400" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="flex items-center gap-2 px-4 py-2 text-lg font-semibold text-gray-900 dark:text-white futuristic:text-cyan-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {format(currentDate, 'MMMM yyyy', { locale: getLocale() })}
                <ChevronDown className="h-4 w-4" />
              </button>
              {renderMonthPicker()}
            </div>

            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-cyan-500/10 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 dark:text-gray-300 futuristic:text-cyan-400" />
            </button>
            
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 futuristic:bg-cyan-500/20 hover:bg-gray-200 dark:hover:bg-gray-600 futuristic:hover:bg-cyan-500/30 rounded-lg transition-colors dark:text-gray-300 futuristic:text-cyan-300"
              >
                {t('calendar.today')}
              </button>
              <button
                onClick={() => goToDate(addMonths(currentDate, 1))}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 futuristic:bg-cyan-500/20 hover:bg-gray-200 dark:hover:bg-gray-600 futuristic:hover:bg-cyan-500/30 rounded-lg transition-colors dark:text-gray-300 futuristic:text-cyan-300"
              >
                +1 {t('calendar.month')}
              </button>
              <button
                onClick={() => goToDate(addMonths(currentDate, 3))}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 futuristic:bg-cyan-500/20 hover:bg-gray-200 dark:hover:bg-gray-600 futuristic:hover:bg-cyan-500/30 rounded-lg transition-colors dark:text-gray-300 futuristic:text-cyan-300"
              >
                +3 {t('calendar.months')}
              </button>
              <button
                onClick={() => goToDate(addMonths(currentDate, 6))}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 futuristic:bg-cyan-500/20 hover:bg-gray-200 dark:hover:bg-gray-600 futuristic:hover:bg-cyan-500/30 rounded-lg transition-colors dark:text-gray-300 futuristic:text-cyan-300"
              >
                +6 {t('calendar.months')}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="month"
              value={format(currentDate, 'yyyy-MM')}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-');
                goToDate(new Date(parseInt(year), parseInt(month) - 1));
              }}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'month' && renderMonthView()}
      
      {/* Day Details Modal */}
      {renderDayDetails()}

      {/* Reschedule Modal */}
      {renderRescheduleModal()}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 futuristic:bg-gray-900/80 futuristic:backdrop-blur-xl futuristic:border futuristic:border-cyan-500/20 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-400/70">{t('calendar.totalThisMonth')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white futuristic:text-cyan-300">
                {bookings.filter(b => {
                  const bookingDate = parseISO(b.interview_date);
                  return isSameMonth(bookingDate, currentDate);
                }).length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500 dark:text-blue-400 futuristic:text-cyan-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 futuristic:bg-gray-900/80 futuristic:backdrop-blur-xl futuristic:border futuristic:border-cyan-500/20 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-400/70">{t('calendar.confirmed')}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 futuristic:text-green-400">
                {bookings.filter(b => {
                  const bookingDate = parseISO(b.interview_date);
                  return isSameMonth(bookingDate, currentDate) && b.status === 'confirmed';
                }).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400 futuristic:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 futuristic:bg-gray-900/80 futuristic:backdrop-blur-xl futuristic:border futuristic:border-cyan-500/20 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-400/70">{t('calendar.pending')}</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 futuristic:text-yellow-400">
                {bookings.filter(b => {
                  const bookingDate = parseISO(b.interview_date);
                  return isSameMonth(bookingDate, currentDate) && b.status === 'pending';
                }).length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500 dark:text-yellow-400 futuristic:text-yellow-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 futuristic:bg-gray-900/80 futuristic:backdrop-blur-xl futuristic:border futuristic:border-cyan-500/20 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-400/70">{t('calendar.cancelled')}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 futuristic:text-red-400">
                {bookings.filter(b => {
                  const bookingDate = parseISO(b.interview_date);
                  return isSameMonth(bookingDate, currentDate) && b.status === 'cancelled';
                }).length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500 dark:text-red-400 futuristic:text-red-400" />
          </div>
        </div>
      </div>
    </div>
  );
}