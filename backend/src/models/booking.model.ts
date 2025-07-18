// backend/src/models/booking.model.ts

export interface Booking {
  id?: number;
  
  // Informații candidat
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  
  // Informații intervievator
  interviewer_id?: number;
  interviewer_name?: string;
  interviewer_email?: string;
  
  // Detalii programare
  booking_date: string; // format: YYYY-MM-DD
  start_time: string;   // format: HH:MM
  end_time: string;     // format: HH:MM
  duration: number;     // în minute
  
  // Tip interviu
  interview_type: 'technical' | 'hr' | 'behavioral' | 'system_design' | 'final';
  
  // Status
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  
  // Detalii adiționale
  meeting_link?: string;
  location?: string;
  notes?: string;
  candidate_notes?: string;
  interviewer_feedback?: string;
  
  // Timestamps
  created_at?: Date;
  updated_at?: Date;
  confirmed_at?: Date;
  cancelled_at?: Date;
  completed_at?: Date;
}

export interface TimeSlot {
  id?: number;
  interviewer_id: number;
  day_of_week: number; // 0-6 (Duminică-Sâmbătă)
  start_time: string;
  end_time: string;
  slot_duration: number; // minute
  break_duration: number; // minute
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UnavailableDate {
  id?: number;
  interviewer_id: number;
  unavailable_date: string;
  reason?: string;
  all_day: boolean;
  start_time?: string;
  end_time?: string;
  created_at?: Date;
}

export interface BookingNotification {
  id?: number;
  user_id: number;
  booking_id: number;
  type: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 
        'booking_reminder' | 'booking_rescheduled' | 'feedback_request';
  title: string;
  message: string;
  is_read: boolean;
  is_sent: boolean;
  sent_at?: Date;
  read_at?: Date;
  created_at?: Date;
}

// DTOs pentru request/response
export interface CreateBookingDTO {
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  interviewer_id?: number;
  booking_date: string;
  start_time: string;
  duration?: number;
  interview_type?: string;
  notes?: string;
  location?: string;
}

export interface UpdateBookingDTO {
  interviewer_id?: number;
  booking_date?: string;
  start_time?: string;
  duration?: number;
  interview_type?: string;
  status?: string;
  notes?: string;
  location?: string;
  meeting_link?: string;
  interviewer_feedback?: string;
}

export interface AvailableSlotsQuery {
  interviewer_id?: number;
  date: string;
  interview_type?: string;
}

export interface AvailableSlot {
  date: string;
  start_time: string;
  end_time: string;
  interviewer_id: number;
  interviewer_name: string;
  available: boolean;
}

// Helper functions pentru validare
export const validateBookingTime = (startTime: string, endTime: string): boolean => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return start < end;
};

export const calculateEndTime = (startTime: string, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

export const isSlotAvailable = (
  slot: AvailableSlot,
  existingBookings: Booking[]
): boolean => {
  return !existingBookings.some(booking => {
    if (booking.status === 'cancelled' || booking.status === 'rescheduled') {
      return false;
    }
    
    const slotStart = new Date(`${slot.date}T${slot.start_time}`);
    const slotEnd = new Date(`${slot.date}T${slot.end_time}`);
    const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`);
    const bookingEnd = new Date(`${booking.booking_date}T${booking.end_time}`);
    
    return (
      (slotStart >= bookingStart && slotStart < bookingEnd) ||
      (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
      (slotStart <= bookingStart && slotEnd >= bookingEnd)
    );
  });
};