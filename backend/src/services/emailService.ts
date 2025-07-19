import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendBookingConfirmation = async (booking: any) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: booking.client_email,
    subject: 'Confirmare Programare Interviu',
    html: `
      <h2>Programare Confirmată</h2>
      <p>Bună ${booking.client_name},</p>
      <p>Programarea ta pentru interviu a fost confirmată.</p>
      <h3>Detalii:</h3>
      <ul>
        <li><strong>Data:</strong> ${format(new Date(booking.interview_date), 'dd MMMM yyyy', { locale: ro })}</li>
        <li><strong>Ora:</strong> ${booking.interview_time}</li>
        <li><strong>Tip:</strong> ${booking.interview_type === 'online' ? 'Online' : 'În persoană'}</li>
      </ul>
      <p>Te rugăm să fii pregătit cu 5 minute înainte.</p>
      <p>Cu stimă,<br>Echipa HR</p>
    `
  };

  return transporter.sendMail(mailOptions);
};

export const sendBookingReminder = async (booking: any) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: booking.client_email,
    subject: 'Reminder: Interviu Mâine',
    html: `
      <h2>Reminder Interviu</h2>
      <p>Bună ${booking.client_name},</p>
      <p>Îți reamintim că mâine ai programat un interviu.</p>
      <h3>Detalii:</h3>
      <ul>
        <li><strong>Data:</strong> ${format(new Date(booking.interview_date), 'dd MMMM yyyy', { locale: ro })}</li>
        <li><strong>Ora:</strong> ${booking.interview_time}</li>
        <li><strong>Tip:</strong> ${booking.interview_type === 'online' ? 'Online' : 'În persoană'}</li>
      </ul>
      <p>Mult succes!</p>
    `
  };

  return transporter.sendMail(mailOptions);
};
