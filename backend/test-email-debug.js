const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🔍 Testing Gmail connection...');
console.log('User:', process.env.SMTP_USER);

// Test 1: Cu service gmail
console.log('\n📧 Test 1: Service Gmail...');
const transporter1 = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter1.verify()
  .then(() => console.log('✅ Test 1: SUCCESS!'))
  .catch(err => console.error('❌ Test 1 failed:', err.message));

// Test 2: Cu configurare manuală și IPv4
console.log('\n📧 Test 2: Manual config cu IPv4...');
const transporter2 = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  family: 4, // Forțează IPv4
  connectionTimeout: 5000,
  greetingTimeout: 5000
});

transporter2.verify()
  .then(() => console.log('✅ Test 2: SUCCESS!'))
  .catch(err => console.error('❌ Test 2 failed:', err.message));

// Test 3: Port 465 cu SSL
console.log('\n📧 Test 3: Port 465 cu SSL...');
const transporter3 = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  family: 4
});

transporter3.verify()
  .then(() => console.log('✅ Test 3: SUCCESS!'))
  .catch(err => console.error('❌ Test 3 failed:', err.message));

// Timeout pentru a închide procesul
setTimeout(() => {
  console.log('\n🏁 Test complet.');
  process.exit(0);
}, 10000);
