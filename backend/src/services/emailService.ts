import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private resend: Resend | null = null;
  private isConfigured: boolean = false;

  constructor() {
    console.log('📧 Initializing email service (Resend)...');
    
    if (process.env.DISABLE_EMAIL === 'true') {
      console.log('📧 Email service DISABLED by configuration');
      return;
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('❌ Resend API key not found!');
      console.log('📧 Email service will not work. Set RESEND_API_KEY in .env');
      return;
    }

    try {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.isConfigured = true;
      console.log('✅ Resend email service configured successfully');
    } catch (error) {
      console.error('❌ Failed to configure Resend:', error);
    }
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.isConfigured || !this.resend) {
      console.log(`📧 Email to ${options.to} skipped (service not configured)`);
      return;
    }

    try {
      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'Interview Booking <onboarding@resend.dev>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(`✅ Email sent successfully to ${options.to}`, result);
    } catch (error: any) {
      console.error('❌ Resend error:', error);
      // Nu arunca eroarea - lasă aplicația să continue
    }
  }

  async sendBookingConfirmation(booking: any, user: any): Promise<void> {
    const bookingDate = new Date(booking.interview_date).toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #007bff; }
          .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Confirmare Programare Interviu</h1>
          </div>
          <div class="content">
            <p>Bună ${user.first_name || 'utilizator'},</p>
            
            <p>Programarea ta pentru interviu a fost confirmată cu succes!</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">Detalii programare:</h3>
              <p><strong>Data:</strong> ${bookingDate}</p>
              <p><strong>Ora:</strong> ${booking.interview_time}</p>
              <p><strong>Tip:</strong> ${booking.interview_type === 'online' ? 'Online (Video Call)' : 'În persoană'}</p>
              <p><strong>ID Programare:</strong> #${booking.id}</p>
              ${booking.notes ? `<p><strong>Note:</strong> ${booking.notes}</p>` : ''}
            </div>
            
            <p>Vei primi un reminder cu o zi înainte de interviu.</p>
            
            <center>
              <a href="${process.env.FRONTEND_URL || 'http://94.156.250.138'}/login" class="button">
                Accesează Contul Tău
              </a>
            </center>
          </div>
          <div class="footer">
            <p>© 2025 Interview Booking App. Toate drepturile rezervate.</p>
            <p>Acest email a fost trimis automat. Te rugăm să nu răspunzi la acest email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Confirmare programare interviu',
      html,
    });
  }

  async sendAdminNotification(booking: any): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const bookingDate = new Date(booking.interview_date).toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          .button { display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Programare Nouă</h1>
          </div>
          <div class="content">
            <p>O nouă programare a fost înregistrată în sistem.</p>
            
            <table>
              <tr>
                <td><strong>Client:</strong></td>
                <td>${booking.client_name}</td>
              </tr>
              <tr>
                <td><strong>Email:</strong></td>
                <td>${booking.client_email}</td>
              </tr>
              <tr>
                <td><strong>Telefon:</strong></td>
                <td>${booking.client_phone}</td>
              </tr>
              <tr>
                <td><strong>Data:</strong></td>
                <td>${bookingDate}</td>
              </tr>
              <tr>
                <td><strong>Ora:</strong></td>
                <td>${booking.interview_time}</td>
              </tr>
              <tr>
                <td><strong>Tip:</strong></td>
                <td>${booking.interview_type === 'online' ? 'Online' : 'În persoană'}</td>
              </tr>
              ${booking.notes ? `
              <tr>
                <td><strong>Note:</strong></td>
                <td>${booking.notes}</td>
              </tr>` : ''}
            </table>
            
            <center>
              <a href="${process.env.FRONTEND_URL || 'http://94.156.250.138'}/admin/bookings" class="button">
                Vezi în Admin Panel
              </a>
            </center>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: adminEmail,
      subject: `Programare nouă: ${booking.client_name}`,
      html,
    });
  }

  async sendPasswordReset(user: any, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://94.156.250.138'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Resetare Parolă</h1>
          </div>
          <div class="content">
            <p>Bună ${user.first_name || 'utilizator'},</p>
            
            <p>Ai solicitat resetarea parolei pentru contul tău. Folosește butonul de mai jos pentru a-ți seta o parolă nouă:</p>
            
            <center>
              <a href="${resetUrl}" class="button">
                Resetează Parola
              </a>
            </center>
            
            <div class="warning">
              <p><strong>Important:</strong></p>
              <ul>
                <li>Acest link expiră în 1 oră</li>
                <li>Dacă nu ai solicitat resetarea parolei, ignoră acest email</li>
                <li>Pentru siguranță, nu împărtăși acest link cu nimeni</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Resetare parolă - Interview Booking App',
      html,
    });
  }

  async sendBookingReminder(booking: any, user: any): Promise<void> {
    const bookingDate = new Date(booking.interview_date).toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffc107; color: #333; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107; }
          .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Reminder: Interviul tău este mâine!</h1>
          </div>
          <div class="content">
            <p>Bună ${user.first_name || 'utilizator'},</p>
            
            <p>Îți reamintim că mâine ai programat un interviu.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">Detalii interviu:</h3>
              <p><strong>Data:</strong> ${bookingDate}</p>
              <p><strong>Ora:</strong> ${booking.interview_time}</p>
              <p><strong>Tip:</strong> ${booking.interview_type === 'online' ? 'Online (Video Call)' : 'În persoană'}</p>
              ${booking.interview_type === 'online' ? 
                '<p><strong>Link meeting:</strong> Vei primi link-ul cu 15 minute înainte de interviu</p>' : 
                '<p><strong>Locație:</strong> Str. Exemplu Nr. 123, București</p>'
              }
            </div>
            
            <p><strong>Sfaturi pentru interviu:</strong></p>
            <ul>
              <li>Pregătește-ți CV-ul actualizat</li>
              <li>Testează conexiunea și camera (pentru interviuri online)</li>
              <li>Fii punctual - conectează-te cu 5 minute înainte</li>
            </ul>
            
            <center>
              <a href="${process.env.FRONTEND_URL || 'http://94.156.250.138'}/login" class="button">
                Vezi Detalii Complete
              </a>
            </center>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Reminder: Interviul tău este mâine!',
      html,
    });
  }

  // Test method
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('❌ Resend not configured');
      return false;
    }

    try {
      console.log('✅ Resend is configured and ready');
      // Poți trimite un email de test aici dacă vrei
      return true;
    } catch (error) {
      console.error('❌ Resend test failed:', error);
      return false;
    }
  }
}

export default new EmailService();