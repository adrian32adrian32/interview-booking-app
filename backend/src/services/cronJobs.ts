import cron from 'node-cron';
import { pool } from '../server';
import emailService from './emailService';

export function initCronJobs() {
  // Rulează zilnic la 10:00 AM pentru a trimite reminder-uri
  cron.schedule('0 10 * * *', async () => {
    console.log('🕐 Running booking reminders job...');
    
    try {
      // Găsește toate programările de mâine
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const result = await pool.query(`
        SELECT b.*, u.email, u.first_name, u.last_name 
        FROM client_bookings b
        LEFT JOIN users u ON u.email = b.client_email
        WHERE b.interview_date = $1 
        AND b.status IN ('pending', 'confirmed')
      `, [tomorrowStr]);
      
      for (const booking of result.rows) {
        const user = {
          email: booking.email || booking.client_email,
          first_name: booking.first_name || booking.client_name.split(' ')[0]
        };
        
        try {
          await emailService.sendBookingReminder(booking, user);
          console.log(`✅ Reminder sent for booking #${booking.id}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder for booking #${booking.id}:`, error);
        }
      }
      
      console.log(`✅ Sent ${result.rows.length} booking reminders`);
    } catch (error) {
      console.error('❌ Error in booking reminders job:', error);
    }
  });
  
  console.log('✅ Cron jobs initialized');
}
