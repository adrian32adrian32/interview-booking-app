// backend/src/services/reminderService.ts
import cron from 'node-cron';
import emailService from './emailService';
import { pool } from '../server';
import { format, addHours, addDays, isAfter, isBefore } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Booking {
  id: number;
  client_name: string;
  client_email: string;
  interview_date: string;
  interview_time: string;
  interview_type: string;
  reminder_24h_sent?: boolean;
  reminder_1h_sent?: boolean;
}

// Funcție pentru a combina data și ora într-un Date object
const getInterviewDateTime = (date: string, time: string): Date => {
  return new Date(`${date}T${time}:00`);
};

// Template-uri email
const emailTemplates = {
  reminder24h: (booking: Booking) => ({
    subject: 'Reminder: Interviul tău este mâine!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Reminder Interviu</h1>
        </div>
        <div style="padding: 20px; background-color: #f3f4f6;">
          <h2>Bună ${booking.client_name},</h2>
          <p>Îți reamintim că mâine ai programat un interviu:</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📅 Data:</strong> ${format(new Date(booking.interview_date), 'EEEE, dd MMMM yyyy', { locale: ro })}</p>
            <p><strong>🕐 Ora:</strong> ${booking.interview_time}</p>
            <p><strong>📍 Tip:</strong> ${booking.interview_type === 'online' ? '💻 Online (vei primi link-ul cu 30 min înainte)' : '🏢 În persoană'}</p>
          </div>
          
          <h3>Pregătește-te:</h3>
          <ul>
            <li>Verifică documentele necesare</li>
            <li>Pregătește întrebările tale</li>
            <li>${booking.interview_type === 'online' ? 'Testează camera și microfonul' : 'Planifică ruta către locație'}</li>
          </ul>
          
          <p style="color: #6b7280; font-size: 14px;">
            Dacă nu mai poți participa, te rugăm să anulezi programarea din contul tău.
          </p>
        </div>
        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2025 Interview Booking System</p>
        </div>
      </div>
    `
  }),

  reminder1h: (booking: Booking) => ({
    subject: 'Interviul tău începe în 1 oră!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">⏰ Reminder Urgent!</h1>
        </div>
        <div style="padding: 20px; background-color: #f3f4f6;">
          <h2>Bună ${booking.client_name},</h2>
          <p style="font-size: 18px;"><strong>Interviul tău începe în 1 oră!</strong></p>
          
          <div style="background-color: #fef2f2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>🕐 Ora:</strong> ${booking.interview_time}</p>
            <p><strong>📍 Tip:</strong> ${booking.interview_type === 'online' ? '💻 Online' : '🏢 În persoană'}</p>
          </div>
          
          ${booking.interview_type === 'online' ? 
            '<p style="background-color: #dbeafe; padding: 15px; border-radius: 8px;">💻 <strong>Link-ul pentru interviu va fi trimis în 30 de minute!</strong></p>' :
            '<p style="background-color: #fef3c7; padding: 15px; border-radius: 8px;">🚗 <strong>Asigură-te că pleci la timp pentru a ajunge!</strong></p>'
          }
        </div>
      </div>
    `
  }),

  followUp: (booking: Booking) => ({
    subject: 'Cum a fost experiența ta?',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Mulțumim pentru participare!</h1>
        </div>
        <div style="padding: 20px; background-color: #f3f4f6;">
          <h2>Bună ${booking.client_name},</h2>
          <p>Sperăm că ai avut o experiență plăcută la interviul de ieri.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 18px;">Cum a fost experiența ta?</p>
            <div style="margin: 20px 0;">
              <span style="font-size: 30px; margin: 0 10px; cursor: pointer;">😊</span>
              <span style="font-size: 30px; margin: 0 10px; cursor: pointer;">😐</span>
              <span style="font-size: 30px; margin: 0 10px; cursor: pointer;">😞</span>
            </div>
          </div>
          
          <p>Vei primi rezultatul în următoarele 3-5 zile lucrătoare.</p>
          
          <p style="color: #6b7280; font-size: 14px;">
            Dacă ai întrebări, nu ezita să ne contactezi.
          </p>
        </div>
      </div>
    `
  })
};

// Funcție pentru trimitere reminder
const sendReminder = async (booking: Booking, type: '24h' | '1h' | 'followup') => {
  try {
    // Creăm un user object minimal pentru emailService
    const user = {
      email: booking.client_email,
      first_name: booking.client_name.split(' ')[0],
      last_name: booking.client_name.split(' ').slice(1).join(' ') || ''
    };
    
    switch(type) {
      case '24h':
        // Folosim metoda existentă sendBookingReminder care e perfect pentru 24h
        await emailService.sendBookingReminder(booking, user);
        break;
        
      case '1h':
        // Pentru 1h reminder, folosim sendBookingConfirmation
        // dar modificăm booking-ul să reflecte urgența
        const urgentBooking = {
          ...booking,
          // Adăugăm un indicator pentru template
          urgent_reminder: true
        };
        await emailService.sendBookingConfirmation(urgentBooking, user);
        break;
        
      case 'followup':
        // Pentru follow-up, trimitem email personalizat
        // Momentan folosim sendBookingConfirmation cu titlu modificat
        const followupBooking = {
          ...booking,
          client_name: `${booking.client_name} - Mulțumim pentru participare!`
        };
        await emailService.sendBookingConfirmation(followupBooking, user);
        break;
    }

    console.log(`✅ Reminder ${type} trimis pentru booking ${booking.id}`);
    return true;
  } catch (error) {
    console.error(`❌ Eroare trimitere reminder ${type} pentru booking ${booking.id}:`, error);
    return false;
  }
};

// Verifică și trimite remindere 24h
const check24HourReminders = async () => {
  try {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowDate = format(tomorrow, 'yyyy-MM-dd');
    
    const query = `
      SELECT * FROM client_bookings 
      WHERE interview_date = $1 
      AND status = 'confirmed'
      AND (reminder_24h_sent IS NULL OR reminder_24h_sent = false)
    `;
    
    const result = await pool.query(query, [tomorrowDate]);
    const bookings = result.rows;

    for (const booking of bookings) {
      const sent = await sendReminder(booking, '24h');
      
      if (sent) {
        await pool.query(
          'UPDATE client_bookings SET reminder_24h_sent = true WHERE id = $1',
          [booking.id]
        );
      }
    }

    console.log(`📧 Verificat ${bookings.length} programări pentru reminder 24h`);
  } catch (error) {
    console.error('❌ Eroare verificare remindere 24h:', error);
  }
};

// Verifică și trimite remindere 1h
const check1HourReminders = async () => {
  try {
    const now = new Date();
    const in1Hour = addHours(now, 1);
    
    const query = `
      SELECT * FROM client_bookings 
      WHERE interview_date = $1 
      AND status = 'confirmed'
      AND (reminder_1h_sent IS NULL OR reminder_1h_sent = false)
    `;
    
    const todayDate = format(now, 'yyyy-MM-dd');
    const result = await pool.query(query, [todayDate]);
    const bookings = result.rows;

    for (const booking of bookings) {
      const interviewTime = getInterviewDateTime(booking.interview_date, booking.interview_time);
      
      // Verifică dacă interviul este în următoarea oră
      if (isAfter(interviewTime, now) && isBefore(interviewTime, in1Hour)) {
        const sent = await sendReminder(booking, '1h');
        
        if (sent) {
          await pool.query(
            'UPDATE client_bookings SET reminder_1h_sent = true WHERE id = $1',
            [booking.id]
          );
        }
      }
    }

    console.log(`⏰ Verificat ${bookings.length} programări pentru reminder 1h`);
  } catch (error) {
    console.error('❌ Eroare verificare remindere 1h:', error);
  }
};

// Verifică și trimite follow-up
const checkFollowUpEmails = async () => {
  try {
    const yesterday = addDays(new Date(), -1);
    const yesterdayDate = format(yesterday, 'yyyy-MM-dd');
    
    const query = `
      SELECT * FROM client_bookings 
      WHERE interview_date = $1 
      AND status = 'completed'
      AND (followup_sent IS NULL OR followup_sent = false)
    `;
    
    const result = await pool.query(query, [yesterdayDate]);
    const bookings = result.rows;

    for (const booking of bookings) {
      const sent = await sendReminder(booking, 'followup');
      
      if (sent) {
        await pool.query(
          'UPDATE client_bookings SET followup_sent = true WHERE id = $1',
          [booking.id]
        );
      }
    }

    console.log(`📮 Trimis ${bookings.length} emailuri follow-up`);
  } catch (error) {
    console.error('❌ Eroare trimitere follow-up:', error);
  }
};

// Inițializează cron jobs
export const initializeReminderSystem = () => {
  // Verifică remindere 24h - rulează la fiecare oră
  cron.schedule('0 * * * *', () => {
    console.log('🔔 Verificare remindere 24h...');
    check24HourReminders();
  });

  // Verifică remindere 1h - rulează la fiecare 15 minute
  cron.schedule('*/15 * * * *', () => {
    console.log('🔔 Verificare remindere 1h...');
    check1HourReminders();
  });

  // Verifică follow-up - rulează zilnic la 10:00
  cron.schedule('0 10 * * *', () => {
    console.log('🔔 Verificare emailuri follow-up...');
    checkFollowUpEmails();
  });

  console.log('✅ Sistem de remindere inițializat cu succes!');
  
  // Log următoarele verificări
  const now = new Date();
  const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
  const next15min = new Date(Math.ceil(now.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000);
  
  console.log(`📅 Următoarea verificare 24h: ${format(nextHour, 'HH:mm')}`);
  console.log(`📅 Următoarea verificare 1h: ${format(next15min, 'HH:mm')}`);
  console.log(`📅 Următoarea verificare follow-up: 10:00`);
};

// Export pentru testare manuală
export const testReminders = {
  test24h: check24HourReminders,
  test1h: check1HourReminders,
  testFollowUp: checkFollowUpEmails,
  
  // Funcție de test pentru un booking specific
  testSpecificBooking: async (bookingId: number, type: '24h' | '1h' | 'followup') => {
    try {
      const result = await pool.query(
        'SELECT * FROM client_bookings WHERE id = $1',
        [bookingId]
      );
      
      if (result.rows.length === 0) {
        console.log('❌ Booking nu a fost găsit');
        return;
      }
      
      const booking = result.rows[0];
      console.log(`🧪 Test reminder ${type} pentru booking #${bookingId}`);
      
      const sent = await sendReminder(booking, type);
      if (sent) {
        console.log('✅ Email trimis cu succes!');
      } else {
        console.log('❌ Eroare la trimitere email');
      }
    } catch (error) {
      console.error('❌ Eroare test:', error);
    }
  }
};