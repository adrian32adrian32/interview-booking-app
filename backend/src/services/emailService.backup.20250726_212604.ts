import dotenv from 'dotenv';
import path from 'path';

// Load .env file explicitly
dotenv.config({ path: path.join(__dirname, '../../.env') });

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import handlebars from 'handlebars';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log('📧 Initializing email service...');
    console.log('Current directory:', __dirname);
    console.log('SMTP Config:', {
      host: process.env.SMTP_HOST || 'Not set',
      port: process.env.SMTP_PORT || 'Not set',
      user: process.env.SMTP_USER ? '✓ Set' : '✗ Not set',
      pass: process.env.SMTP_PASS ? '✓ Set' : '✗ Not set'
    });

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verifică conexiunea dar nu bloca aplicația
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email service error:', error.message);
        console.error('Email functionality will not work, but app will continue');
      } else {
        console.log('✅ Email service ready');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // Verifică dacă există folder-ul de template-uri
      const templatePath = path.join(__dirname, '..', 'templates', 'email', `${options.template}.hbs`);
      
      let html = `<h1>Email Template Not Found</h1><p>Template: ${options.template}</p>`;
      
      try {
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const template = handlebars.compile(templateContent);
        html = template(options.data);
      } catch (err) {
        console.warn(`⚠️ Template ${options.template} not found, using fallback`);
        // Folosește un template simplu de fallback
        html = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${options.subject}</h2>
            <pre>${JSON.stringify(options.data, null, 2)}</pre>
          </div>
        `;
      }

      const mailOptions = {
        from: `"Interview Booking" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✉️ Email sent successfully to:', options.to);
      console.log('Message ID:', info.messageId);
    } catch (error: any) {
      console.error('❌ Error sending email:', error.message);
      // Nu arunca eroarea - lasă aplicația să continue
    }
  }

  async sendBookingConfirmation(booking: any, user: any): Promise<void> {
    const data = {
      userName: user.first_name || user.email.split('@')[0],
      bookingDate: new Date(booking.interview_date).toLocaleDateString('ro-RO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      bookingTime: booking.interview_time,
      interviewType: booking.interview_type === 'online' ? 'Online (Video Call)' : 'În persoană',
      bookingId: booking.id,
      loginUrl: `${process.env.FRONTEND_URL || 'http://94.156.250.138'}/login`,
    };

    await this.sendEmail({
      to: user.email,
      subject: 'Confirmare programare interviu',
      template: 'booking-confirmation',
      data,
    });
  }

  async sendBookingReminder(booking: any, user: any): Promise<void> {
    const data = {
      userName: user.first_name || user.email.split('@')[0],
      bookingDate: new Date(booking.interview_date).toLocaleDateString('ro-RO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      bookingTime: booking.interview_time,
      interviewType: booking.interview_type === 'online' ? 'Online (Video Call)' : 'În persoană',
      meetingLink: booking.interview_type === 'online' ? 'https://meet.google.com/xxx-xxxx-xxx' : null,
      officeAddress: booking.interview_type === 'in_person' ? 'Str. Exemplu Nr. 123, București' : null,
    };

    await this.sendEmail({
      to: user.email,
      subject: 'Reminder: Interviul tău este mâine',
      template: 'booking-reminder',
      data,
    });
  }

  async sendPasswordReset(user: any, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://94.156.250.138'}/reset-password?token=${resetToken}`;
    
    const data = {
      userName: user.first_name || user.email.split('@')[0],
      resetUrl,
      expiresIn: '1 oră',
    };

    await this.sendEmail({
      to: user.email,
      subject: 'Resetare parolă',
      template: 'password-reset',
      data,
    });
  }

  async sendAdminNotification(booking: any): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    
    const data = {
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientPhone: booking.client_phone,
      bookingDate: new Date(booking.interview_date).toLocaleDateString('ro-RO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      bookingTime: booking.interview_time,
      interviewType: booking.interview_type === 'online' ? 'Online' : 'În persoană',
      notes: booking.notes || 'Fără note adiționale',
      adminUrl: `${process.env.FRONTEND_URL || 'http://94.156.250.138'}/admin/bookings`,
    };

    await this.sendEmail({
      to: adminEmail,
      subject: `Programare nouă: ${booking.client_name}`,
      template: 'admin-new-booking',
      data,
    });
  }
}

export default new EmailService();
