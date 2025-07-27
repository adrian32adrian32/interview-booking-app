const { socketService } = require('./dist/services/socketService');

setTimeout(() => {
  console.log('Sending test notification...');
  socketService.notifyAdmins({
    type: 'booking_created',
    title: 'Test Notificare!',
    message: 'Aceasta este o notificare de test pentru admin.',
    priority: 'high',
    sound: true
  });
  console.log('Notification sent!');
}, 1000);
