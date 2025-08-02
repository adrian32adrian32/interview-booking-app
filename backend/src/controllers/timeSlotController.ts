import { Request, Response } from 'express';
const { pool } = require('../config/database');

// Definește sloturile de timp disponibile
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

// Obține sloturile disponibile pentru o dată
export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    // Obține sloturile ocupate pentru data respectivă
    const result = await pool.query(
      'SELECT interview_time FROM client_bookings WHERE interview_date = $1 AND status != $2',
      [date, 'cancelled']
    );
    
    const bookedSlots = result.rows.map(row => row.interview_time);
    const availableSlots = TIME_SLOTS.filter(slot => !bookedSlots.includes(slot));
    
    res.json({
      date,
      availableSlots,
      allSlots: TIME_SLOTS,
      bookedSlots
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
};

// Obține toate sloturile
export const getAllSlots = async (req: Request, res: Response) => {
  try {
    res.json({
      slots: TIME_SLOTS,
      workingHours: {
        start: '09:00',
        end: '18:00',
        interval: 30
      }
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};

// Verifică disponibilitatea unui slot
export const checkSlotAvailability = async (req: Request, res: Response) => {
  try {
    const { date, time } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM client_bookings WHERE interview_date = $1 AND interview_time = $2 AND status != $3',
      [date, time, 'cancelled']
    );
    
    const isAvailable = result.rows.length === 0;
    
    res.json({
      date,
      time,
      isAvailable,
      booking: isAvailable ? null : result.rows[0]
    });
  } catch (error) {
    console.error('Error checking slot availability:', error);
    res.status(500).json({ error: 'Failed to check slot availability' });
  }
};

// Funcții administrative pentru sloturi
export const createSlot = async (req: Request, res: Response) => {
  // Implementare pentru creare slot nou
  res.json({ message: 'Create slot - to be implemented' });
};

export const updateSlot = async (req: Request, res: Response) => {
  // Implementare pentru actualizare slot
  res.json({ message: 'Update slot - to be implemented' });
};

export const deleteSlot = async (req: Request, res: Response) => {
  // Implementare pentru ștergere slot
  res.json({ message: 'Delete slot - to be implemented' });
};
