const nodemailer = require('nodemailer');

// Configurare transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true pentru 465, false pentru alte porturi
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Template-uri email predefinite
const emailTemplates = {
  welcome: (firstName) => ({
    subject: 'Bine ai venit la Interview Booking!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Bine ai venit, ${firstName}!</h1>
        <p>Contul tău a fost creat cu succes. Acum poți să:</p>
        <ul>
          <li>Îți completezi profilul</li>
          <li>Încarci documentele necesare</li>
          <li>Programezi un interviu</li>
        </ul>
        <p>Dacă ai întrebări, nu ezita să ne contactezi.</p>
        <hr style="border: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Acest email a fost trimis automat. Te rugăm să nu răspunzi la el.
        </p>
      </div>
    `
  }),

  appointmentConfirmation: (firstName, date, time) => ({
    subject: 'Confirmare programare interviu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Programare confirmată!</h2>
        <p>Salut ${firstName},</p>
        <p>Programarea ta pentru interviu a fost confirmată:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
          <p><strong>Data:</strong> ${date}</p>
          <p><strong>Ora:</strong> ${time}</p>
        </div>
        <p>Te rugăm să te prezinți cu 10 minute înainte și să ai asupra ta documentele necesare.</p>
        <p>Dacă nu poți ajunge, te rugăm să anulezi programarea din contul tău.</p>
      </div>
    `
  }),

  appointmentReminder: (firstName, date, time) => ({
    subject: 'Reminder: Interviu mâine',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF9800;">Reminder programare</h2>
        <p>Salut ${firstName},</p>
        <p>Îți reamintim că mâine ai programare pentru interviu:</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #FF9800;">
          <p><strong>Data:</strong> ${date}</p>
          <p><strong>Ora:</strong> ${time}</p>
        </div>
        <p>Nu uita să aduci documentele necesare!</p>
      </div>
    `
  }),

  adminNotification: (type, data) => ({
    subject: `[Admin] ${type}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Notificare Administrator</h2>
        <p><strong>Tip:</strong> ${type}</p>
        <p><strong>Data/Ora:</strong> ${new Date().toLocaleString('ro-RO')}</p>
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px;">
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    `
  })
};

// Funcție principală pentru trimitere email
const sendEmail = async ({ to, subject, html, text, attachments }) => {
  try {
    // Verifică că avem configurație validă
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email credentials not configured!');
      return { success: false, error: 'Email service not configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Interview Booking" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags pentru text version
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email trimis:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Eroare la trimitere email:', error);
    return { success: false, error: error.message };
  }
};

// Funcții helper pentru diferite tipuri de email
const sendWelcomeEmail = async (email, firstName) => {
  const template = emailTemplates.welcome(firstName);
  return sendEmail({
    to: email,
    ...template
  });
};

const sendAppointmentConfirmation = async (email, firstName, date, time) => {
  const template = emailTemplates.appointmentConfirmation(firstName, date, time);
  return sendEmail({
    to: email,
    ...template
  });
};

const sendAppointmentReminder = async (email, firstName, date, time) => {
  const template = emailTemplates.appointmentReminder(firstName, date, time);
  return sendEmail({
    to: email,
    ...template
  });
};

const sendAdminNotification = async (type, data) => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@example.com'];
  const template = emailTemplates.adminNotification(type, data);
  
  const promises = adminEmails.map(email => 
    sendEmail({
      to: email.trim(),
      ...template
    })
  );
  
  return Promise.all(promises);
};

// Funcție pentru trimitere email bulk
const sendBulkEmail = async (recipients, subject, html, options = {}) => {
  const { 
    batchSize = 50, 
    delayBetweenBatches = 1000,
    trackOpens = false 
  } = options;

  const results = {
    sent: [],
    failed: []
  };

  // Împarte recipienții în batch-uri
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    // Trimite email-uri în paralel pentru fiecare batch
    const batchPromises = batch.map(async (recipient) => {
      try {
        let modifiedHtml = html;
        
        // Adaugă tracking pixel dacă e necesar
        if (trackOpens) {
          const trackingPixel = `<img src="${process.env.BACKEND_URL}/api/email/track/${recipient.id}" width="1" height="1" style="display:none;">`;
          modifiedHtml = html + trackingPixel;
        }

        const result = await sendEmail({
          to: recipient.email,
          subject: subject,
          html: modifiedHtml.replace(/{{firstName}}/g, recipient.firstName)
                           .replace(/{{lastName}}/g, recipient.lastName)
                           .replace(/{{email}}/g, recipient.email)
        });

        if (result.success) {
          results.sent.push(recipient.email);
        } else {
          results.failed.push({ email: recipient.email, error: result.error });
        }
      } catch (error) {
        results.failed.push({ email: recipient.email, error: error.message });
      }
    });

    await Promise.all(batchPromises);

    // Pauză între batch-uri pentru a evita rate limiting
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendAdminNotification,
  sendBulkEmail,
  emailTemplates
};