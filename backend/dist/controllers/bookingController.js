"use strict";
// backend/src/controllers/bookingController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingController = void 0;
const pg_1 = require("pg");
const booking_model_1 = require("../models/booking.model");
const pool = new pg_1.Pool({
    // Configurația ta pentru PostgreSQL
    connectionString: process.env.DATABASE_URL
});
class BookingController {
    // Obține toate programările
    async getAllBookings(req, res) {
        try {
            const { status, date, interviewer_id, candidate_id } = req.query;
            let query = `
        SELECT b.*, 
               u1.name as candidate_name,
               u2.name as interviewer_name
        FROM bookings b
        LEFT JOIN users u1 ON b.candidate_id = u1.id
        LEFT JOIN users u2 ON b.interviewer_id = u2.id
        WHERE 1=1
      `;
            const params = [];
            let paramCount = 0;
            if (status) {
                query += ` AND b.status = $${++paramCount}`;
                params.push(status);
            }
            if (date) {
                query += ` AND b.booking_date = $${++paramCount}`;
                params.push(date);
            }
            if (interviewer_id) {
                query += ` AND b.interviewer_id = $${++paramCount}`;
                params.push(interviewer_id);
            }
            if (candidate_id) {
                query += ` AND b.candidate_id = $${++paramCount}`;
                params.push(candidate_id);
            }
            query += ' ORDER BY b.booking_date, b.start_time';
            const result = await pool.query(query, params);
            res.json({
                success: true,
                data: result.rows
            });
        }
        catch (error) {
            console.error('Error fetching bookings:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea programărilor'
            });
        }
    }
    // Obține o programare specifică
    async getBookingById(req, res) {
        try {
            const { id } = req.params;
            const query = `
        SELECT b.*, 
               u1.name as candidate_name,
               u2.name as interviewer_name
        FROM bookings b
        LEFT JOIN users u1 ON b.candidate_id = u1.id
        LEFT JOIN users u2 ON b.interviewer_id = u2.id
        WHERE b.id = $1
      `;
            const result = await pool.query(query, [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Programarea nu a fost găsită'
                });
            }
            res.json({
                success: true,
                data: result.rows[0]
            });
        }
        catch (error) {
            console.error('Error fetching booking:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea programării'
            });
        }
    }
    // Creează o nouă programare
    async createBooking(req, res) {
        try {
            const bookingData = req.body;
            const userId = req.user?.id; // Din middleware-ul de autentificare
            // Calculează end_time
            const duration = bookingData.duration || 60;
            const end_time = (0, booking_model_1.calculateEndTime)(bookingData.start_time, duration);
            // Verifică disponibilitatea
            if (bookingData.interviewer_id) {
                const availabilityCheck = await pool.query('SELECT check_slot_availability($1, $2, $3, $4) as available', [bookingData.interviewer_id, bookingData.booking_date, bookingData.start_time, end_time]);
                if (!availabilityCheck.rows[0].available) {
                    return res.status(400).json({
                        success: false,
                        message: 'Slotul selectat nu este disponibil'
                    });
                }
            }
            // Inserează programarea
            const insertQuery = `
        INSERT INTO bookings (
          candidate_id, candidate_name, candidate_email, candidate_phone,
          interviewer_id, booking_date, start_time, end_time, duration,
          interview_type, notes, location, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
            const values = [
                userId,
                bookingData.candidate_name,
                bookingData.candidate_email,
                bookingData.candidate_phone || null,
                bookingData.interviewer_id || null,
                bookingData.booking_date,
                bookingData.start_time,
                end_time,
                duration,
                bookingData.interview_type || 'technical',
                bookingData.notes || null,
                bookingData.location || null,
                'scheduled'
            ];
            const result = await pool.query(insertQuery, values);
            const newBooking = result.rows[0];
            // Creează notificare
            await this.createNotification(newBooking.id, userId, 'booking_created', 'Programare nouă creată', `Programarea ta pentru ${bookingData.booking_date} la ora ${bookingData.start_time} a fost creată cu succes.`);
            // Trimite notificare la intervievator dacă există
            if (bookingData.interviewer_id) {
                await this.createNotification(newBooking.id, bookingData.interviewer_id, 'booking_created', 'Ai o programare nouă', `Ai fost asignat pentru un interviu în data de ${bookingData.booking_date} la ora ${bookingData.start_time}.`);
            }
            res.status(201).json({
                success: true,
                message: 'Programarea a fost creată cu succes',
                data: newBooking
            });
        }
        catch (error) {
            console.error('Error creating booking:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la crearea programării'
            });
        }
    }
    // Actualizează o programare
    async updateBooking(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            // Construiește query-ul dinamic
            const updateFields = [];
            const values = [];
            let paramCount = 0;
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    updateFields.push(`${key} = $${++paramCount}`);
                    values.push(updateData[key]);
                }
            });
            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nu există date pentru actualizare'
                });
            }
            // Dacă se schimbă timpul, recalculează end_time
            if (updateData.start_time && updateData.duration) {
                const end_time = (0, booking_model_1.calculateEndTime)(updateData.start_time, updateData.duration);
                updateFields.push(`end_time = $${++paramCount}`);
                values.push(end_time);
            }
            values.push(id);
            const updateQuery = `
        UPDATE bookings 
        SET ${updateFields.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;
            const result = await pool.query(updateQuery, values);
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Programarea nu a fost găsită'
                });
            }
            res.json({
                success: true,
                message: 'Programarea a fost actualizată cu succes',
                data: result.rows[0]
            });
        }
        catch (error) {
            console.error('Error updating booking:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la actualizarea programării'
            });
        }
    }
    // Anulează o programare
    async cancelBooking(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const query = `
        UPDATE bookings 
        SET status = 'cancelled', 
            cancelled_at = CURRENT_TIMESTAMP,
            notes = COALESCE(notes || E'\n', '') || 'Motiv anulare: ' || $1
        WHERE id = $2
        RETURNING *
      `;
            const result = await pool.query(query, [reason || 'Niciun motiv specificat', id]);
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Programarea nu a fost găsită'
                });
            }
            const booking = result.rows[0];
            // Notifică candidatul
            await this.createNotification(booking.id, booking.candidate_id, 'booking_cancelled', 'Programare anulată', `Programarea ta din ${booking.booking_date} a fost anulată.`);
            // Notifică intervievatorul
            if (booking.interviewer_id) {
                await this.createNotification(booking.id, booking.interviewer_id, 'booking_cancelled', 'Programare anulată', `Programarea din ${booking.booking_date} la ora ${booking.start_time} a fost anulată.`);
            }
            res.json({
                success: true,
                message: 'Programarea a fost anulată cu succes',
                data: booking
            });
        }
        catch (error) {
            console.error('Error cancelling booking:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la anularea programării'
            });
        }
    }
    // Obține sloturile disponibile
    async getAvailableSlots(req, res) {
        try {
            const { date, interviewer_id, interview_type } = req.query;
            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Data este obligatorie'
                });
            }
            // Obține ziua săptămânii
            const dayOfWeek = new Date(date).getDay();
            // Obține sloturile configurate pentru ziua respectivă
            let slotsQuery = `
        SELECT ts.*, u.name as interviewer_name
        FROM time_slots ts
        JOIN users u ON ts.interviewer_id = u.id
        WHERE ts.day_of_week = $1 AND ts.is_active = true
      `;
            const params = [dayOfWeek];
            let paramCount = 1;
            if (interviewer_id) {
                slotsQuery += ` AND ts.interviewer_id = $${++paramCount}`;
                params.push(interviewer_id);
            }
            const slotsResult = await pool.query(slotsQuery, params);
            // Pentru fiecare slot, generează intervalele disponibile
            const availableSlots = [];
            for (const slot of slotsResult.rows) {
                // Obține programările existente pentru acea zi
                const bookingsQuery = `
          SELECT * FROM bookings
          WHERE interviewer_id = $1
          AND booking_date = $2
          AND status NOT IN ('cancelled', 'rescheduled')
        `;
                const bookingsResult = await pool.query(bookingsQuery, [slot.interviewer_id, date]);
                const existingBookings = bookingsResult.rows;
                // Generează sloturile bazate pe configurație
                const startTime = new Date(`2000-01-01T${slot.start_time}`);
                const endTime = new Date(`2000-01-01T${slot.end_time}`);
                const slotDuration = slot.slot_duration;
                const breakDuration = slot.break_duration;
                let currentTime = new Date(startTime);
                while (currentTime < endTime) {
                    const slotStart = currentTime.toTimeString().slice(0, 5);
                    currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
                    const slotEnd = currentTime.toTimeString().slice(0, 5);
                    if (currentTime <= endTime) {
                        const availableSlot = {
                            date,
                            start_time: slotStart,
                            end_time: slotEnd,
                            interviewer_id: slot.interviewer_id,
                            interviewer_name: slot.interviewer_name,
                            available: true
                        };
                        // Verifică dacă slotul este disponibil
                        availableSlot.available = (0, booking_model_1.isSlotAvailable)(availableSlot, existingBookings);
                        availableSlots.push(availableSlot);
                    }
                    // Adaugă pauza
                    currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
                }
            }
            res.json({
                success: true,
                data: availableSlots
            });
        }
        catch (error) {
            console.error('Error fetching available slots:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea sloturilor disponibile'
            });
        }
    }
    // Helper pentru creare notificări
    async createNotification(bookingId, userId, type, title, message) {
        try {
            const query = `
        INSERT INTO notifications (booking_id, user_id, type, title, message)
        VALUES ($1, $2, $3, $4, $5)
      `;
            await pool.query(query, [bookingId, userId, type, title, message]);
        }
        catch (error) {
            console.error('Error creating notification:', error);
        }
    }
}
exports.BookingController = BookingController;
