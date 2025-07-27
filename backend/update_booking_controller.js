// Adaugă după salvarea booking-ului în baza de date:

// Trimite email de confirmare
try {
  const user = booking.user_id ? 
    await db.query('SELECT * FROM users WHERE id = $1', [booking.user_id]) :
    { email: booking.client_email, first_name: booking.client_name };
    
  await emailService.sendBookingConfirmation(booking, user);
  
  // Trimite notificare la admin
  await emailService.sendAdminNotification(booking);
} catch (emailError) {
  console.error('Error sending emails:', emailError);
  // Nu bloca crearea booking-ului dacă email-ul eșuează
}
