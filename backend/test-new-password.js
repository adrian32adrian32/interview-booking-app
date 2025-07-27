const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Testing email with:');
console.log('User:', process.env.SMTP_USER);
console.log('Pass:', process.env.SMTP_PASS ? '***hidden***' : 'NOT SET');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Eroare:', error.message);
  } else {
    console.log('✅ Gmail conectat cu succes!');
  }
});
