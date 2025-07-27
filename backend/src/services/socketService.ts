// backend/src/services/socketService.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server';

interface User {
  id: number;
  email: string;
  role: string;
}

interface NotificationData {
  type: 'booking_created' | 'booking_updated' | 'booking_cancelled' | 'document_uploaded' | 'user_registered';
  title: string;
  message: string;
  data?: any;
  timestamp?: Date;  // Făcut opțional pentru a evita erorile
  priority?: 'low' | 'medium' | 'high';
  sound?: boolean;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, { userId: number; role: string; socketId: string }> = new Map();

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://94.156.250.138',
          'http://94.156.250.138:3001',
          process.env.FRONTEND_URL || ''
        ].filter(Boolean),
        credentials: true
      }
    });

    // Middleware pentru autentificare
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        socket.data.user = {
          id: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role
        };
        
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      const user = socket.data.user as User;
      console.log(`🔌 User connected: ${user.email} (${user.role})`);
      
      // Store connected user
      this.connectedUsers.set(socket.id, {
        userId: user.id,
        role: user.role,
        socketId: socket.id
      });

      // Join role-specific room
      socket.join(`role:${user.role}`);
      socket.join(`user:${user.id}`);
      
      // Join admin room if admin
      if (user.role === 'admin') {
        socket.join('admins');
      }

      // Send connection success
      socket.emit('connected', {
        message: 'Connected to notification system',
        userId: user.id
      });

      // Handle ping for keeping connection alive
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle notification acknowledgment
      socket.on('notification:acknowledge', (notificationId: string) => {
        console.log(`📬 Notification ${notificationId} acknowledged by user ${user.id}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${user.email}`);
        this.connectedUsers.delete(socket.id);
      });
    });

    console.log('✅ Socket.io server initialized');
  }

  // Trimite notificare către admini
  notifyAdmins(notification: NotificationData) {
    if (!this.io) return;
    
    console.log('📢 Notifying admins:', notification.title);
    this.io.to('admins').emit('notification', {
      id: Date.now().toString(),
      ...notification,
      timestamp: notification.timestamp || new Date()
    });
  }

  // Trimite notificare către un user specific
  notifyUser(userId: number, notification: NotificationData) {
    if (!this.io) return;
    
    console.log(`📢 Notifying user ${userId}:`, notification.title);
    this.io.to(`user:${userId}`).emit('notification', {
      id: Date.now().toString(),
      ...notification,
      timestamp: notification.timestamp || new Date()
    });
  }

  // Trimite notificare către toți userii
  notifyAll(notification: NotificationData) {
    if (!this.io) return;
    
    console.log('📢 Notifying all users:', notification.title);
    this.io.emit('notification', {
      id: Date.now().toString(),
      ...notification,
      timestamp: notification.timestamp || new Date()
    });
  }

  // Trimite update în timp real pentru bookings
  broadcastBookingUpdate(eventType: string, booking: any) {
    if (!this.io) return;
    
    // Notifică adminii
    if (eventType === 'created') {
      this.notifyAdmins({
        type: 'booking_created',
        title: 'Programare Nouă!',
        message: `${booking.client_name} a făcut o programare pentru ${booking.interview_date}`,
        data: booking,
        timestamp: new Date(),  // Adăugat timestamp
        priority: 'high',
        sound: true
      });
    } else if (eventType === 'updated') {
      this.notifyAdmins({
        type: 'booking_updated',
        title: 'Programare Actualizată',
        message: `Programarea #${booking.id} a fost actualizată`,
        data: booking,
        timestamp: new Date(),  // Adăugat timestamp
        priority: 'medium'
      });
    } else if (eventType === 'cancelled') {
      this.notifyAdmins({
        type: 'booking_cancelled',
        title: 'Programare Anulată',
        message: `Programarea #${booking.id} a fost anulată`,
        data: booking,
        timestamp: new Date(),  // Adăugat timestamp
        priority: 'high',
        sound: true
      });
    }

    // Emit event pentru update UI
    this.io.to('admins').emit('booking:update', {
      type: eventType,
      booking
    });
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected admins
  getConnectedAdmins(): number {
    return Array.from(this.connectedUsers.values()).filter(u => u.role === 'admin').length;
  }
}

export const socketService = new SocketService();

// Helper function pentru a trimite notificări din alte părți ale aplicației
export const sendNotification = {
  toAdmins: (notification: Omit<NotificationData, 'timestamp'>) => {
    socketService.notifyAdmins({
      ...notification,
      timestamp: new Date()
    });
  },
  
  toUser: (userId: number, notification: Omit<NotificationData, 'timestamp'>) => {
    socketService.notifyUser(userId, {
      ...notification,
      timestamp: new Date()
    });
  },
  
  toAll: (notification: Omit<NotificationData, 'timestamp'>) => {
    socketService.notifyAll({
      ...notification,
      timestamp: new Date()
    });
  }
};