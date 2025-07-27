require('dotenv').config();
const { Resend } = require('resend');

console.log('Testing with API Key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');

const resend = new Resend(process.env.RESEND_API_KEY);

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'adrian32adrian32@gmail.com', // Email-ul tău
  subject: 'Test Interview App - Resend Works! 🎉',
  html: `
    <h1>Felicitări! Email-ul funcționează!</h1>
    <p>Acum poți trimite email-uri din Interview Booking App.</p>
    <ul>
      <li>✅ Confirmare programări</li>
      <li>✅ Resetare parolă</li>
      <li>✅ Notificări admin</li>
    </ul>
    <p>Sent at: ${new Date().toLocaleString('ro-RO')}</p>
  `
}).then(result => {
  console.log('✅ SUCCESS!', result);
}).catch(error => {
  console.error('❌ ERROR:', error);
});
