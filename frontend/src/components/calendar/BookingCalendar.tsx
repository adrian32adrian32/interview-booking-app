'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useState, useEffect, useRef } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Booking {
  id: number;
  client_name: string;
  client_email: string;
  interview_date: string;
  interview_time: string;
  interview_type: string;
  status: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    booking: Booking;
  };
}

export default function BookingCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);

  // Culori pentru status
  const statusColors = {
    confirmed: '#10b981', // green
    pending: '#f59e0b',   // amber
    completed: '#3b82f6', // blue
    cancelled: '#ef4444', // red
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/api/bookings');
      const bookings = response.data;
      
      // Transform bookings în events pentru calendar
      const calendarEvents = bookings.map((booking: Booking) => {
        const startDateTime = `${booking.interview_date}T${booking.interview_time}`;
        const endTime = new Date(startDateTime);
        endTime.setHours(endTime.getHours() + 1); // Presupunem 1 oră per interviu
        
        return {
          id: booking.id.toString(),
          title: `${booking.interview_time} - ${booking.client_name}`,
          start: startDateTime,
          end: endTime.toISOString(),
          backgroundColor: statusColors[booking.status as keyof typeof statusColors] || '#6b7280',
          borderColor: statusColors[booking.status as keyof typeof statusColors] || '#6b7280',
          extendedProps: {
            booking
          }
        };
      });
      
      setEvents(calendarEvents);
    } catch (error) {
      toast.error('Eroare la încărcarea programărilor');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (info: any) => {
    const booking = info.event.extendedProps.booking;
    setSelectedBooking(booking);
    setShowModal(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    // Redirect la pagina de creare booking cu data preselectată
    const date = format(selectInfo.start, 'yyyy-MM-dd');
    window.location.href = `/booking?date=${date}`;
  };

  const handleEventDrop = async (info: any) => {
    const booking = info.event.extendedProps.booking;
    const newDate = format(info.event.start, 'yyyy-MM-dd');
    const newTime = format(info.event.start, 'HH:mm');
    
    try {
      await axios.put(`/api/bookings/${booking.id}`, {
        ...booking,
        interview_date: newDate,
        interview_time: newTime
      });
      
      toast.success('Programare actualizată cu succes!');
      fetchBookings(); // Refresh
    } catch (error) {
      toast.error('Eroare la actualizarea programării');
      info.revert(); // Revert la poziția originală
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Calendar Programări
          </h2>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Confirmate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span>În așteptare</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Completate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Anulate</span>
            </div>
          </div>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale="ro"
          firstDay={1} // Luni primul
          events={events}
          editable={true}
          droppable={true}
          selectable={true}
          selectMirror={true}
          eventClick={handleEventClick}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          height="auto"
          slotMinTime="08:00:00"
          slotMaxTime="19:00:00"
          weekends={false} // Fără weekend
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5], // Luni - Vineri
            startTime: '09:00',
            endTime: '18:00',
          }}
          buttonText={{
            today: 'Azi',
            month: 'Lună',
            week: 'Săptămână',
            day: 'Zi'
          }}
        />
      </div>

      {/* Modal pentru detalii booking */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full m-4">
            <h3 className="text-xl font-bold mb-4">Detalii Programare</h3>
            
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Client:</span> {selectedBooking.client_name}
              </div>
              <div>
                <span className="font-semibold">Email:</span> {selectedBooking.client_email}
              </div>
              <div>
                <span className="font-semibold">Data:</span>{' '}
                {format(new Date(selectedBooking.interview_date), 'dd MMMM yyyy', { locale: ro })}
              </div>
              <div>
                <span className="font-semibold">Ora:</span> {selectedBooking.interview_time}
              </div>
              <div>
                <span className="font-semibold">Tip:</span>{' '}
                {selectedBooking.interview_type === 'online' ? 'Online' : 'La birou'}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{' '}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium text-white`}
                  style={{
                    backgroundColor: statusColors[selectedBooking.status as keyof typeof statusColors]
                  }}
                >
                  {selectedBooking.status}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => window.location.href = `/admin/bookings/${selectedBooking.id}`}
                className="flex-1 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition"
              >
                Vezi Detalii
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-700 transition"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
