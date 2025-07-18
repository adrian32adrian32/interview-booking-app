"use strict";
// backend/src/models/booking.model.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSlotAvailable = exports.calculateEndTime = exports.validateBookingTime = void 0;
// Helper functions pentru validare
const validateBookingTime = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return start < end;
};
exports.validateBookingTime = validateBookingTime;
const calculateEndTime = (startTime, duration) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};
exports.calculateEndTime = calculateEndTime;
const isSlotAvailable = (slot, existingBookings) => {
    return !existingBookings.some(booking => {
        if (booking.status === 'cancelled' || booking.status === 'rescheduled') {
            return false;
        }
        const slotStart = new Date(`${slot.date}T${slot.start_time}`);
        const slotEnd = new Date(`${slot.date}T${slot.end_time}`);
        const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`);
        const bookingEnd = new Date(`${booking.booking_date}T${booking.end_time}`);
        return ((slotStart >= bookingStart && slotStart < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (slotStart <= bookingStart && slotEnd >= bookingEnd));
    });
};
exports.isSlotAvailable = isSlotAvailable;
