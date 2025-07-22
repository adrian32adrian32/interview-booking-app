'use client';

import { useState, useEffect } from 'react';

interface Slot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  available_spots: number;
}

interface ExistingBooking {
  id: string;
  client_name: string;
  client_email: string;
  interview_date: string;
  interview_time: string;
  status: string;
  interview_type: string;
}

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState('');
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingBooking, setExistingBooking] = useState<ExistingBooking | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Zilele săptămânii în română
  const daysOfWeek = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'];
  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];

  useEffect(() => {
    checkExistingBooking();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadSlots();
    }
  }, [selectedDate]);

  const checkExistingBooking = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('My bookings data:', data);
        
        if (data.success && data.bookings && data.bookings.length > 0) {
          // Găsește o programare activă (pending sau confirmed)
          const activeBooking = data.bookings.find((b: ExistingBooking) => 
            b.status === 'confirmed' || b.status === 'pending'
          );
          
          if (activeBooking) {
            setExistingBooking(activeBooking);
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing booking:', error);
      // Ignore errors
    }
  };

  const loadSlots = async () => {
    setLoadingSlots(true);
    setError('');
    setSlots([]);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nu ești autentificat');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/available-slots?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Available slots data:', data);
        
        if (data.success) {
          setSlots(data.data?.slots || data.slots || []);
          if (!data.data?.slots?.length && !data.slots?.length) {
            setError('Nu există sloturi disponibile pentru această dată.');
          }
        } else {
          setError(data.message || 'Nu s-au putut încărca sloturile disponibile');
        }
      } else {
        setError('Nu s-au putut încărca sloturile disponibile');
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      setError('Eroare de conexiune. Verifică dacă ai selectat o dată validă.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot) {
      setError('Te rog selectează un slot!');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nu ești autentificat');
        return;
      }

      // Găsește slotul selectat pentru a obține ora
      const selectedSlotData = slots.find(s => s.id === selectedSlot);
      if (!selectedSlotData) {
        setError('Slot invalid selectat');
        return;
      }

      const bookingData = {
        slotId: selectedSlot,
        date: selectedDate,
        time: selectedSlotData.time,
        interview_type: 'online' // sau poți adăuga o opțiune pentru user să aleagă
      };

      console.log('Sending booking data:', bookingData);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();
      console.log('Booking response:', data);

      if (response.ok && data.success) {
        setSuccess('🎉 Programare creată cu succes! Te așteptăm!');
        setSelectedSlot(null);
        setSelectedDate('');
        
        // Reîncarcă booking-urile existente
        setTimeout(() => {
          checkExistingBooking();
        }, 1000);
        
        // Refresh după 3 secunde
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setError(data.message || data.error || 'Eroare la creare programare');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setError('Eroare de conexiune. Te rog încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Ești sigur că vrei să anulezi programarea?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nu ești autentificat');
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
        setSuccess('Programare anulată cu succes!');
        setExistingBooking(null);
        
        // Reîncarcă calendarul
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(data.message || 'Eroare la anulare');
      }
    } catch (error) {
      console.error('Error canceling booking:', error);
      setError('Eroare de conexiune');
    } finally {
      setLoading(false);
    }
  };

  // Funcții pentru calendar
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateForDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('ro-RO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setDisplayMonth(newDate);
  };

  const selectDate = (day: number) => {
    const selected = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selected <= today) {
      setError('Nu poți selecta o dată din trecut!');
      return;
    }
    
    const dateStr = selected.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setError('');
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(displayMonth);
    const firstDay = getFirstDayOfMonth(displayMonth);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Spații goale pentru zilele dinaintea lunii
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-3"></div>);
    }

    // Zilele lunii
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      const isPast = date < today;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isSelected = selectedDate === dateStr;
      const isToday = date.toDateString() === today.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => !isPast && !isWeekend && selectDate(day)}
          disabled={isPast || isWeekend}
          className={`
            p-3 rounded-lg text-center transition-all duration-200 relative
            ${isPast || isWeekend ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
            ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
            ${!isPast && !isWeekend && !isSelected ? 'bg-white text-gray-700' : ''}
          `}
        >
          <span className="font-medium">{day}</span>
          {isToday && (
            <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>
          )}
        </button>
      );
    }

    return days;
  };

  // Dacă există deja o programare
  if (existingBooking) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Ai deja o programare activă!
            </h3>
            <div className="bg-white rounded-lg p-4 mt-4 mb-6">
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">📅 Data:</span> {formatDateForDisplay(existingBooking.interview_date)}
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">🕐 Ora:</span> {existingBooking.interview_time}
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">📍 Tip:</span> {existingBooking.interview_type === 'online' ? 'Online' : 'În persoană'}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">📊 Status:</span>{' '}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  existingBooking.status === 'confirmed' 
                    ? 'bg-green-100 text-green-800' 
                    : existingBooking.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {existingBooking.status === 'confirmed' ? 'Confirmat' : 
                   existingBooking.status === 'pending' ? 'În așteptare' : 
                   existingBooking.status}
                </span>
              </p>
            </div>
            <button
              onClick={() => handleCancelBooking(existingBooking.id)}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se anulează...' : '❌ Anulează programarea'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Luna anterioară"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h3 className="text-xl font-bold text-gray-800">
              {monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear()}
            </h3>
            
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Luna următoare"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 p-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {renderCalendar()}
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p>• Selectează o zi lucrătoare pentru interviu</p>
            <p>• Weekend-urile nu sunt disponibile</p>
          </div>
        </div>

        {/* Sloturi orare */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {selectedDate ? (
              <>🕐 Ore disponibile pentru {formatDateForDisplay(selectedDate)}</>
            ) : (
              <>📅 Selectează o dată din calendar</>
            )}
          </h3>

          {selectedDate && (
            <>
              {loadingSlots ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Nu există sloturi disponibile pentru această dată.</p>
                  <p className="text-sm mt-2">Încearcă să selectezi o altă dată.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id)}
                        disabled={!slot.available}
                        className={`
                          p-4 rounded-lg text-center transition-all duration-200
                          ${selectedSlot === slot.id
                            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-600 ring-offset-2'
                            : slot.available
                            ? 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                          }
                        `}
                      >
                        <div className="font-bold text-lg">{slot.time}</div>
                        <div className="text-xs mt-1">
                          {slot.available 
                            ? `${slot.available_spots} ${slot.available_spots === 1 ? 'loc' : 'locuri'}`
                            : 'Ocupat'
                          }
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedSlot && (
                    <button
                      onClick={handleBooking}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Se procesează...
                        </span>
                      ) : (
                        '✅ Confirmă programarea'
                      )}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}