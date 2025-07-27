const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmail() {
  console.log('🔍 Testing Gmail SMTP...');
  console.log('User:', process.env.SMTP_USER);
  console.log('Pass length:', process.env.SMTP_PASS?.length || 0);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    logger: true,
    debug: true,
    connectionTimeout: 3000,
    greetingTimeout: 3000,
    socketTimeout: 3000
  });
  
  try {
    console.log('Attempting connection...');
    const result = await transporter.verify();
    console.log('✅ SUCCESS! Gmail is ready');
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.code, error.message);
    return false;
  }
}

// Test cu promise timeout
Promise.race([
  testGmail(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Global timeout')), 5000)
  )
])
.then(() => process.exit(0))
.catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
