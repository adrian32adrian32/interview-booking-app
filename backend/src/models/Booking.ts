export interface Booking {
  id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  interview_type: 'online' | 'in-person';
  date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBookingDto {
  client_name: string;
  client_email: string;
  client_phone: string;
  interview_type: 'online' | 'in-person';
  date: string;
  time_slot: string;
  notes?: string;
}

export interface UpdateBookingDto {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
}
