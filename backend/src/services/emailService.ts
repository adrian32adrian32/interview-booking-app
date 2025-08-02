import { Resend } from 'resend';
import { pool } from '../server';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

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

  // Funcția existentă pentru trimitere email
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

  // Funcție nouă pentru a înlocui variabilele în template
  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Replace {{variable}} with actual values
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    
    // Handle conditional blocks {{#if variable}}...{{/if}}
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    result = result.replace(conditionalRegex, (match, varName, content) => {
      return variables[varName] ? content : '';
    });
    
    return result;
  }

  // Funcție nouă pentru a obține template din DB
  private async getEmailTemplate(templateName: string) {
    try {
      const result = await pool.query(
        'SELECT * FROM email_templates WHERE name = $1 AND is_active = true',
        [templateName]
      );
      
      if (result.rows.length === 0) {
        console.warn(`⚠️ Template '${templateName}' not found in DB, using fallback`);
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching email template:', error);
      return null;
    }
  }

  // Funcție nouă pentru logare email
  private async logEmail(
    templateName: string,
    recipientEmail: string,
    recipientName: string,
    subject: string,
    status: 'sent' | 'failed',
    errorMessage?: string
  ) {
    try {
      // Get template ID
      const templateResult = await pool.query(
        'SELECT id FROM email_templates WHERE name = $1',
        [templateName]
      );
      
      const templateId = templateResult.rows[0]?.id;
      
      await pool.query(
        `INSERT INTO email_logs 
         (template_id, recipient_email, recipient_name, subject, status, error_message, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          templateId,
          recipientEmail,
          recipientName,
          subject,
          status,
          errorMessage,
          status === 'sent' ? new Date() : null
        ]
      );
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  // Funcție generică pentru trimitere cu template
  private async sendTemplateEmail(
    templateName: string,
    recipientEmail: string,
    recipientName: string,
    variables: Record<string, any>,
    fallbackHtml?: string
  ): Promise<void> {
    try {
      // Încearcă să ia template-ul din DB
      const template = await this.getEmailTemplate(templateName);
      
      let subject: string;
      let html: string;
      
      if (template) {
        // Folosește template din DB
        subject = this.replaceTemplateVariables(template.subject, variables);
        html = this.replaceTemplateVariables(template.template_html, variables);
      } else if (fallbackHtml) {
        // Folosește fallback HTML
        subject = variables.subject || 'Notificare';
        html = fallbackHtml;
      } else {
        console.error(`❌ No template or fallback for '${templateName}'`);
        return;
      }
      
      // Trimite email
      await this.sendEmail({
        to: recipientEmail,
        subject: subject,
        html: html
      });
      
      // Log success
      await this.logEmail(templateName, recipientEmail, recipientName, subject, 'sent');
      
    } catch (error: any) {
      console.error(`❌ Error sending template email '${templateName}':`, error);
      await this.logEmail(templateName, recipientEmail, recipientName, '', 'failed', error.message);
    }
  }

  // Metodele existente actualizate
  async sendBookingConfirmation(booking: any, user: any): Promise<void> {
    const bookingDate = new Date(booking.interview_date).toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const variables = {
      client_name: booking.client_name || `${user.first_name} ${user.last_name}`,
      first_name: user.first_name || 'utilizator',
      interview_date: bookingDate,
      interview_time: booking.interview_time,
      interview_type: booking.interview_type === 'online' ? 'Online (Video Call)' : 'În persoană',
      booking_id: booking.id,
      notes: booking.notes || '',
      frontend_url: process.env.FRONTEND_URL || 'http://94.156.250.138'
    };

    // HTML de fallback (cel existent)
    const fallbackHtml = `
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

    await this.sendTemplateEmail(
      'booking_confirmation',
      user.email,
      booking.client_name,
      { ...variables, subject: 'Confirmare programare interviu' },
      fallbackHtml
    );
  }

  async sendAdminNotification(booking: any): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const bookingDate = new Date(booking.interview_date).toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const variables = {
      client_name: booking.client_name,
      client_email: booking.client_email,
      client_phone: booking.client_phone,
      interview_date: bookingDate,
      interview_time: booking.interview_time,
      interview_type: booking.interview_type === 'online' ? 'Online' : 'În persoană',
      booking_id: booking.id,
      notes: booking.notes || '',
      frontend_url: process.env.FRONTEND_URL || 'http://94.156.250.138'
    };

    const fallbackHtml = `
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

    await this.sendTemplateEmail(
      'admin_notification',
      adminEmail,
      'Admin',
      { ...variables, subject: `Programare nouă: ${booking.client_name}` },
      fallbackHtml
    );
  }

  // FUNCȚIE NOUĂ PENTRU REPROGRAMARE
  async sendRescheduleEmail({ booking, oldDate, oldTime, clientEmail, clientName }: {
    booking: any;
    oldDate: string;
    oldTime: string;
    clientEmail: string;
    clientName: string;
  }): Promise<void> {
    // Formatează datele pentru afișare frumoasă
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return date.toLocaleDateString('ro-RO', options);
    };

    const newDateFormatted = formatDate(booking.interview_date);
    const oldDateFormatted = formatDate(oldDate);

    const variables = {
      client_name: clientName,
      old_date: oldDateFormatted,
      old_time: oldTime,
      new_date: newDateFormatted,
      new_time: booking.interview_time,
      interview_type: booking.interview_type === 'online' ? 'Online (Video Call)' : 'În persoană',
      booking_id: booking.id,
      frontend_url: process.env.FRONTEND_URL || 'http://94.156.250.138'
    };
    
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #ff9800;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .alert-box {
            background-color: #FFF3CD;
            border: 2px solid #ff9800;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .old-date {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            text-decoration: line-through;
            margin: 10px 0;
            border: 1px solid #f5c6cb;
          }
          .new-date {
            background-color: #d4edda;
            color: #155724;
            padding: 20px;
            border-radius: 5px;
            margin: 10px 0;
            font-size: 18px;
            font-weight: bold;
            border: 2px solid #28a745;
          }
          .button {
            display: inline-block;
            padding: 15px 40px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background-color: #218838;
          }
          .info-section {
            background-color: white;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #17a2b8;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
          .icon {
            font-size: 20px;
            margin-right: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Interviul Dvs. a fost Reprogramat</h1>
        </div>
        
        <div class="content">
          <p>Bună ziua, <strong>${clientName}</strong>,</p>
          
          <div class="alert-box">
            <strong>⚠️ ATENȚIE IMPORTANTĂ!</strong><br>
            Interviul dumneavoastră a fost reprogramat. Vă rugăm să citiți cu atenție noile detalii de mai jos.
          </div>
          
          <h2>📅 Detalii Reprogramare:</h2>
          
          <div class="old-date">
            <strong>❌ Data VECHE (ANULATĂ):</strong><br>
            <span class="icon">📅</span> ${oldDateFormatted}<br>
            <span class="icon">🕐</span> Ora: ${oldTime}
          </div>
          
          <div class="new-date">
            <strong>✅ DATA NOUĂ:</strong><br>
            <span class="icon">📅</span> ${newDateFormatted}<br>
            <span class="icon">🕐</span> Ora: ${booking.interview_time}
          </div>
          
          <div class="info-section">
            <h3>📍 Informații Interviu:</h3>
            <p><strong>Tip interviu:</strong> ${
              booking.interview_type === 'online' 
                ? '💻 Online - Veți primi link-ul de conectare cu 30 minute înainte' 
                : booking.interview_type === 'onsite'
                ? '🏢 La sediul companiei'
                : '📍 În persoană'
            }</p>
            <p><strong>Durata estimată:</strong> 45-60 minute</p>
            ${booking.interview_type === 'online' ? `
              <p><strong>Platforma:</strong> Zoom/Google Meet</p>
              <p><strong>Cerințe tehnice:</strong> Cameră web, microfon, conexiune stabilă la internet</p>
            ` : `
              <p><strong>Adresa:</strong> Str. Victoriei, Nr. 10, Baia Mare</p>
              <p><strong>Recepție:</strong> Anunțați la recepție că aveți programare pentru interviu</p>
            `}
          </div>
          
          <center>
            <a href="${process.env.FRONTEND_URL || 'http://94.156.250.138'}/booking/confirm/${booking.id}" class="button">
              ✅ Confirmă Participarea la Noua Dată
            </a>
          </center>
          
          <div class="info-section" style="background-color: #e3f2fd; border-left-color: #2196F3;">
            <h3>ℹ️ Important:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Confirmați urgent</strong> participarea la noua dată</li>
              <li>Dacă noua dată <strong>nu vă convine</strong>, contactați-ne imediat</li>
              <li>Veți primi <strong>reminder</strong> cu 24h și 1h înainte</li>
              <li>În caz de întrebări: <a href="tel:+40744123456">0744 123 456</a></li>
            </ul>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0;"><strong>⏰ Vă rugăm să fiți punctual!</strong><br>
            Recomandăm să vă conectați/ajungeți cu 5-10 minute înainte.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți la acest email.</p>
          <p>Pentru suport: support@company.ro | 0744 123 456</p>
        </div>
      </body>
      </html>
    `;

    await this.sendTemplateEmail(
      'booking_reschedule',
      clientEmail,
      clientName,
      { ...variables, subject: '⚠️ Reprogramare Interviu - Acțiune Necesară' },
      fallbackHtml
    );
  }

  // FUNCȚIE NOUĂ PENTRU NOTIFICARE ADMIN DESPRE REPROGRAMARE
  async sendAdminRescheduleNotification({ booking, oldDate, oldTime }: {
    booking: any;
    oldDate: string;
    oldTime: string;
  }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ro-RO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const variables = {
      client_name: booking.client_name,
      client_email: booking.client_email,
      client_phone: booking.client_phone,
      old_date: formatDate(oldDate),
      old_time: oldTime,
      new_date: formatDate(booking.interview_date),
      new_time: booking.interview_time,
      interview_type: booking.interview_type === 'online' ? 'Online' : 'În persoană',
      booking_id: booking.id,
      status: booking.status
    };
    
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
          .old-info { background-color: #ffebee; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .new-info { background-color: #e8f5e9; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔄 Notificare Reprogramare Interviu</h2>
          </div>
          
          <div class="content">
            <p>Un interviu a fost reprogramat prin sistemul de calendar.</p>
            
            <div class="details">
              <h3>👤 Informații Client:</h3>
              <p><strong>Nume:</strong> ${booking.client_name}</p>
              <p><strong>Email:</strong> ${booking.client_email}</p>
              <p><strong>Telefon:</strong> ${booking.client_phone}</p>
            </div>
            
            <div class="old-info">
              <h3>❌ Programare Veche:</h3>
              <p><strong>Data:</strong> ${formatDate(oldDate)}</p>
              <p><strong>Ora:</strong> ${oldTime}</p>
            </div>
            
            <div class="new-info">
              <h3>✅ Programare Nouă:</h3>
              <p><strong>Data:</strong> ${formatDate(booking.interview_date)}</p>
              <p><strong>Ora:</strong> ${booking.interview_time}</p>
              <p><strong>Tip:</strong> ${booking.interview_type === 'online' ? 'Online' : 'În persoană'}</p>
            </div>
            
            <p style="margin-top: 20px;">
              <strong>Status:</strong> ${booking.status}<br>
              <strong>ID Programare:</strong> #${booking.id}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Email de notificare a fost trimis automat către client.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendTemplateEmail(
      'admin_reschedule_notification',
      adminEmail,
      'Admin',
      { ...variables, subject: `🔄 Reprogramare Interviu - ${booking.client_name}` },
      fallbackHtml
    );
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

  async sendBookingReminder(booking: any, user: any, hoursBeforeInterview: number = 24): Promise<void> {
    const bookingDate = new Date(booking.interview_date).toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const variables = {
      client_name: booking.client_name || user.first_name || 'utilizator',
      first_name: user.first_name || 'utilizator',
      interview_date: bookingDate,
      interview_time: booking.interview_time,
      interview_type: booking.interview_type === 'online' ? 'Online (Video Call)' : 'În persoană',
      frontend_url: process.env.FRONTEND_URL || 'http://94.156.250.138'
    };

    const templateName = hoursBeforeInterview === 24 ? 'reminder_24h' : 'reminder_1h';
    
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${hoursBeforeInterview === 24 ? '#ffc107' : '#dc3545'}; color: ${hoursBeforeInterview === 24 ? '#333' : 'white'}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid ${hoursBeforeInterview === 24 ? '#ffc107' : '#dc3545'}; }
          .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Reminder: Interviul tău este ${hoursBeforeInterview === 24 ? 'mâine' : 'în curând'}!</h1>
          </div>
          <div class="content">
            <p>Bună ${user.first_name || 'utilizator'},</p>
            
            <p>Îți reamintim că ${hoursBeforeInterview === 24 ? 'mâine ai' : 'în curând ai'} programat un interviu.</p>
            
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

    await this.sendTemplateEmail(
      templateName,
      user.email,
      booking.client_name,
      { ...variables, subject: `Reminder: Interviul tău este ${hoursBeforeInterview === 24 ? 'mâine' : 'în curând'}!` },
      fallbackHtml
    );
  }

  // Metode noi pentru template-uri
  async send24HourReminder(booking: any): Promise<void> {
    const user = {
      email: booking.client_email,
      first_name: booking.client_name.split(' ')[0]
    };
    await this.sendBookingReminder(booking, user, 24);
  }

  async send1HourReminder(booking: any): Promise<void> {
    const user = {
      email: booking.client_email,
      first_name: booking.client_name.split(' ')[0]
    };
    await this.sendBookingReminder(booking, user, 1);
  }

  async sendCancellationEmail(booking: any, reason?: string): Promise<void> {
    const variables = {
      client_name: booking.client_name,
      interview_date: format(new Date(booking.interview_date), 'dd.MM.yyyy'),
      interview_time: booking.interview_time,
      reason: reason || ''
    };

    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6c757d; color: white; padding: 20px; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Programare Anulată</h1>
          </div>
          <div class="content">
            <p>Bună ${booking.client_name},</p>
            <p>Îți confirmăm că programarea ta a fost anulată.</p>
            <p><strong>Data:</strong> ${variables.interview_date}</p>
            <p><strong>Ora:</strong> ${booking.interview_time}</p>
            ${reason ? `<p><strong>Motiv:</strong> ${reason}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendTemplateEmail(
      'booking_cancelled',
      booking.client_email,
      booking.client_name,
      { ...variables, subject: 'Programare anulată' },
      fallbackHtml
    );
  }

  async sendWelcomeEmail(user: any): Promise<void> {
    const variables = {
      first_name: user.first_name,
      username: user.username
    };

    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 30px; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bun venit!</h1>
          </div>
          <div class="content">
            <p>Salut ${user.first_name},</p>
            <p>Îți mulțumim că te-ai înregistrat!</p>
            <p>Username: <strong>${user.username}</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendTemplateEmail(
      'welcome_email',
      user.email,
      user.first_name,
      { ...variables, subject: 'Bun venit la Interview Booking App!' },
      fallbackHtml
    );
  }

  // Metode noi pentru template system
  async sendBulkEmails(
    templateName: string,
    recipients: Array<{ email: string; name: string; variables: Record<string, any> }>,
    options?: {
      batchSize?: number;
      delayMs?: number;
    }
  ) {
    const batchSize = options?.batchSize || 10;
    const delayMs = options?.delayMs || 1000;
    const results = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(recipient => 
        this.sendTemplateEmail(templateName, recipient.email, recipient.name, recipient.variables)
          .then(() => ({ email: recipient.email, success: true }))
          .catch(error => ({ email: recipient.email, success: false, error: error.message }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay între batch-uri
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return results;
  }

  async sendTestEmail(templateName: string, testEmail: string) {
    const testVariables: Record<string, any> = {
      client_name: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      interview_date: format(new Date(), 'EEEE, d MMMM yyyy', { locale: ro }),
      interview_time: '14:00',
      interview_type: 'Online (Video Call)',
      booking_id: '999',
      client_email: 'test@example.com',
      client_phone: '0712345678',
      reason: 'This is a test reason',
      frontend_url: process.env.FRONTEND_URL || 'http://94.156.250.138'
    };
    
    await this.sendTemplateEmail(templateName, testEmail, 'Test User', testVariables);
  }

  async getEmailStats(days: number = 30) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_emails,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM email_logs
        WHERE created_at >= NOW() - INTERVAL '${days} days'
      `);
      
      const byTemplate = await pool.query(`
        SELECT 
          et.name as template_name,
          COUNT(el.id) as count,
          COUNT(CASE WHEN el.status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN el.status = 'failed' THEN 1 END) as failed
        FROM email_templates et
        LEFT JOIN email_logs el ON et.id = el.template_id
        WHERE el.created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY et.id, et.name
        ORDER BY count DESC
      `);
      
      return {
        overall: result.rows[0],
        byTemplate: byTemplate.rows
      };
    } catch (error) {
      console.error('Error getting email stats:', error);
      throw error;
    }
  }

  // Test method
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('❌ Resend not configured');
      return false;
    }

    try {
      console.log('✅ Resend is configured and ready');
      return true;
    } catch (error) {
      console.error('❌ Resend test failed:', error);
      return false;
    }
  }
}

export default new EmailService();