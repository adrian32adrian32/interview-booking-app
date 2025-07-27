// frontend/src/services/socketService.ts
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

interface NotificationData {
  id: string;
  type: 'booking_created' | 'booking_updated' | 'booking_cancelled' | 'document_uploaded' | 'user_registered';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high';
  sound?: boolean;
}

interface SocketServiceType {
  socket: Socket | null;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) {
      console.log('🔌 Socket already connected');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    console.log('🔌 Connecting to socket server:', socketUrl);

    this.socket = io(socketUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.reconnectAttempts = 0;
      this.emit('connected', true);
      
      // Start ping interval to keep connection alive
      this.startPingInterval();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.emit('connected', false);
      this.stopPingInterval();
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🔴 Max reconnection attempts reached');
        this.emit('connectionFailed', true);
      }
    });

    // Notification events
    this.socket.on('notification', (notification: NotificationData) => {
      console.log('📬 New notification:', notification);
      this.emit('notification', notification);
      
      // Play sound if enabled
      if (notification.sound) {
        this.playNotificationSound();
      }
    });

    // Booking updates
    this.socket.on('booking:update', (data: any) => {
      console.log('📊 Booking update:', data);
      this.emit('bookingUpdate', data);
    });

    // Pong response
    this.socket.on('pong', () => {
      console.log('🏓 Pong received');
    });
  }

  private pingInterval: NodeJS.Timeout | null = null;

  private startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => {
        if (err.name !== 'NotAllowedError') {
          console.error('Error playing notification sound:', err);
        }
      });
    } catch (error) {
      console.error('Error with notification sound:', error);
    }
  }

  disconnect() {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Event emitter pattern
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  // Public methods
  acknowledgeNotification(notificationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('notification:acknowledge', notificationId);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance
const socketService = new SocketService();

// React hook pentru Socket.io
export const useSocket = () => {
  return socketService;
};

export default socketService;