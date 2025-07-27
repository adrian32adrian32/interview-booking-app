'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, XCircle, Volume2, VolumeX } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import socketService from '@/services/socketService';

interface Notification {
  id: string;
  type: 'booking_created' | 'booking_updated' | 'booking_cancelled' | 'document_uploaded' | 'user_registered';
  title: string;
  message: string;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high';
  sound?: boolean;
  read?: boolean;
  data?: any;
}

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) return;

    // Load saved preferences
    const savedSoundPref = localStorage.getItem('notificationSound');
    if (savedSoundPref !== null) {
      setSoundEnabled(savedSoundPref === 'true');
    }

    // Load saved notifications from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
    }

    // Connect to Socket.io using our service
    if (!socketService.isConnected()) {
      console.log('🔌 Connecting to Socket.io...');
      socketService.connect(token);
    }

    // Listen for connection status
    const unsubscribeConnected = socketService.on('connected', (isConnected: boolean) => {
      console.log('🔌 Socket connection status:', isConnected);
      setConnected(isConnected);
    });

    // Listen for new notifications
    const unsubscribeNotification = socketService.on('notification', (notification: Notification) => {
      console.log('📬 New real-time notification:', notification);
      
      // Add notification only once
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => 
          n.id === notification.id || 
          (n.title === notification.title && 
           n.message === notification.message && 
           Math.abs(new Date(n.timestamp).getTime() - new Date(notification.timestamp).getTime()) < 5000)
        );
        
        if (exists) {
          console.log('Duplicate notification detected, skipping');
          return prev;
        }
        
        // Show toast only for new notifications
        showToastNotification(notification);
        
        // Play sound if enabled
        if (notification.sound && soundEnabled) {
          playNotificationSound();
        }
        
        // Update unread count
        setUnreadCount(count => count + 1);
        
        return [notification, ...prev];
      });
    });

    // Listen for booking updates
    const unsubscribeBookingUpdate = socketService.on('bookingUpdate', (data: any) => {
      console.log('📊 Booking update:', data);
      // You can update UI here if needed
      // For example, refresh bookings list if on admin dashboard
    });

    // Cleanup function
    return () => {
      unsubscribeConnected();
      unsubscribeNotification();
      unsubscribeBookingUpdate();
    };
  }, []); // Remove soundEnabled from dependencies to prevent re-connection

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 50)));
    }
  }, [notifications]);

  const showToastNotification = (notification: Notification) => {
    const Icon = getNotificationIcon(notification.type);
    
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5`}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Icon className={`h-6 w-6 ${getNotificationColor(notification.type)}`} />
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {notification.title}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {notification.message}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'top-right',
    });
  };

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.volume = 0.5;
      }
      audioRef.current.play().catch(err => {
        if (err.name !== 'NotAllowedError') {
          console.error('Error playing sound:', err);
        }
      });
    } catch (error) {
      console.error('Error with notification sound:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_created':
        return CheckCircle;
      case 'booking_cancelled':
        return XCircle;
      case 'booking_updated':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking_created':
        return 'text-green-500';
      case 'booking_cancelled':
        return 'text-red-500';
      case 'booking_updated':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Acknowledge notification on server
    socketService.acknowledgeNotification(notificationId);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications');
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('notificationSound', String(newValue));
    toast.success(`Sunet notificări ${newValue ? 'activat' : 'dezactivat'}`);
  };

  // Render notifications panel using Portal
  const renderNotificationsPanel = () => {
    if (!mounted || !showNotifications) return null;

    return createPortal(
      <>
        {/* Dark overlay pentru tot ecranul */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999998]" 
          onClick={() => setShowNotifications(false)}
        />
        
        {/* Notifications Panel - Slide-in from right */}
        <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-[#0C0C0D] shadow-2xl z-[999999] transform transition-transform duration-300 ease-out">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0C0C0D]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                <Bell className="h-6 w-6" />
                Notificări
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Închide notificări"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={toggleSound}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span>Sunet {soundEnabled ? 'activat' : 'dezactivat'}</span>
              </button>
              
              {notifications.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Citește toate
                  </button>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <button
                    onClick={clearNotifications}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    Șterge toate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="h-full pt-[136px] pb-4 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                  <Bell className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">Nu ai notificări noi</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Vei primi notificări când apar programări noi
                </p>
              </div>
            ) : (
              <div className="space-y-1 px-4">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-all duration-200 ${
                        !notification.read ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                          notification.type === 'booking_created' ? 'bg-green-100 dark:bg-green-900/40' : 
                          notification.type === 'booking_cancelled' ? 'bg-red-100 dark:bg-red-900/40' : 
                          'bg-yellow-100 dark:bg-yellow-900/40'
                        }`}>
                          <Icon className={`h-5 w-5 ${getNotificationColor(notification.type)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className={`text-sm font-medium leading-5 ${
                                !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.title}
                              </p>
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-5">
                                {notification.message}
                              </p>
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                                {format(new Date(notification.timestamp), 'dd MMM, HH:mm', { locale: ro })}
                              </p>
                            </div>
                            {notification.priority === 'high' && (
                              <span className="flex-shrink-0 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                Urgent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>,
      document.body
    );
  };

  return (
    <>
      <div className="relative">
        {/* Notification Bell */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-white dark:text-gray-300 hover:text-gray-200 dark:hover:text-white transition-colors"
          aria-label="Notificări"
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          
          {/* Connection Status Indicator */}
          <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500'
          } ${connected ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* Render notifications panel using Portal */}
      {renderNotificationsPanel()}
    </>
  );
}