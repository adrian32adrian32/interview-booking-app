'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Calendar, Clock, User, Mail, Phone, FileText, CheckCircle, AlertCircle, ArrowLeft, Home, CalendarDays, FileStack, UserCircle, Menu, X } from 'lucide-react';
import { toastService } from '@/services/toastService';
import Link from 'next/link';
import TimeSlotPicker from '@/components/booking/TimeSlotPicker';
import { format } from 'date-fns';
import { ro, enUS, it, fr, de, es, ru, uk } from 'date-fns/locale';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138:5000/api';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface UserData {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  name?: string;
}

// Mini sidebar pentru user
const UserSidebar = ({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) => {
  const { t } = useLanguage();
  const router = useRouter();
  
  const menuItems = [
    { name: t('sidebar.dashboard'), href: '/dashboard', icon: Home },
    { name: t('sidebar.myBookings'), href: '/bookings', icon: CalendarDays },
    { name: t('sidebar.myDocuments'), href: '/documents', icon: FileStack },
    { name: t('sidebar.profile'), href: '/profile', icon: UserCircle },
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 h-full ${isOpen ? 'w-64' : 'w-full'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Interview Booking</h2>
          {onClose && (
            <button onClick={onClose} className="lg:hidden">
              <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default function BookingPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    interview_date: '',
    interview_time: '',
    interview_type: 'online',
    notes: ''
  });

  const [errors, setErrors] = useState<any>({});

  // Helper function pentru date locale
  const getDateLocale = () => {
    switch (language) {
      case 'ro': return ro;
      case 'en': return enUS;
      case 'it': return it;
      case 'fr': return fr;
      case 'de': return de;
      case 'es': return es;
      case 'ru': return ru;
      case 'uk': return uk;
      default: return enUS;
    }
  };

  // Prelua datele utilizatorului logat
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoggedIn(false);
          return;
        }

        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success && response.data.user) {
          const user = response.data.user;
          setIsLoggedIn(true);
          setUserData(user);
          
          // Construiește numele complet
          let fullName = '';
          if (user.first_name && user.last_name) {
            fullName = `${user.first_name} ${user.last_name}`;
          } else if (user.name) {
            fullName = user.name;
          } else if (user.username) {
            fullName = user.username;
          } else {
            fullName = user.email.split('@')[0];
          }
          
          // Setează datele în formular
          setFormData(prev => ({
            ...prev,
            client_name: fullName,
            client_email: user.email || '',
            client_phone: user.phone || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsLoggedIn(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Verifică email pentru utilizatori nelogați
  useEffect(() => {
    const checkEmail = async () => {
      // Verifică doar dacă nu suntem logați și avem un email valid
      if (!isLoggedIn && formData.client_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
        setCheckingEmail(true);
        try {
          const response = await axios.get(`${API_URL}/bookings/check-client`, {
            params: { email: formData.client_email }
          });
          
          if (response.data.exists && response.data.client) {
            const client = response.data.client;
            
            // Construiește numele complet
            let fullName = '';
            if (client.first_name && client.last_name) {
              fullName = `${client.first_name} ${client.last_name}`;
            } else if (client.first_name) {
              fullName = client.first_name;
            } else if (client.last_name) {
              fullName = client.last_name;
            } else {
              fullName = client.email.split('@')[0];
            }
            
            // Actualizează formData
            setFormData(prev => ({
              ...prev,
              client_name: fullName,
              client_phone: client.phone || prev.client_phone
            }));
            
            // Afișează mesaj
            toastService.success('success.generic', `${t('booking.welcomeBack')}, ${fullName}!`);
          }
        } catch (error) {
          console.error('Error checking email:', error);
        } finally {
          setCheckingEmail(false);
        }
      }
    };
    
    const debounceTimer = setTimeout(checkEmail, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.client_email, isLoggedIn, t]);

  // Sincronizează selectedDate și selectedTime cu formData
  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        interview_date: format(selectedDate, 'yyyy-MM-dd')
      }));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime) {
      setFormData(prev => ({
        ...prev,
        interview_time: selectedTime
      }));
      setErrors((prev: any) => ({ ...prev, interview_time: '' }));
    }
  }, [selectedTime]);

  const validateStep = (currentStep: number) => {
    const newErrors: any = {};
    
    if (currentStep === 1) {
      if (!formData.client_name.trim()) {
        newErrors.client_name = t('booking.errors.nameRequired');
      }
      
      if (!formData.client_email.trim()) {
        newErrors.client_email = t('booking.errors.emailRequired');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
        newErrors.client_email = t('booking.errors.emailInvalid');
      }
      
      if (!formData.client_phone.trim()) {
        newErrors.client_phone = t('booking.errors.phoneRequired');
      } else if (!/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/im.test(formData.client_phone.replace(/\s/g, ''))) {
        newErrors.client_phone = t('booking.errors.phoneInvalid');
      }
    }
    
    if (currentStep === 2) {
      if (!formData.interview_date) {
        newErrors.interview_date = t('booking.errors.dateRequired');
      }
      if (!formData.interview_time) {
        newErrors.interview_time = t('booking.errors.timeRequired');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    // Pentru utilizatori logați, sari peste pasul 1 dacă datele sunt complete
    if (step === 1 && isLoggedIn && formData.client_name && formData.client_email && formData.client_phone) {
      setStep(2);
      return;
    }
    
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    
    setLoading(true);
    
    // Debugging - log data being sent
    console.log('📤 Sending booking data:', formData);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/bookings`, formData, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      console.log('✅ Booking response:', response.data);
      
      if (response.data.success) {
        toastService.success('success.generic', t('booking.bookingCreated'));
        setStep(4); // Success step
        
        // Redirect după 3 secunde
        setTimeout(() => {
          if (isLoggedIn) {
            router.push('/bookings');
          } else {
            router.push('/');
          }
        }, 3000);
      }
    } catch (error: any) {
      console.error('❌ Booking error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      // Show more detailed error message
      const errorMessage = error.response?.data?.error || error.response?.data?.message || t('booking.errors.createError');
      toastService.error('error.generic', errorMessage);
      
      // If it's a slot already taken error, you might want to refresh the time slots
      if (errorMessage.includes('rezervat') || errorMessage.includes('taken') || errorMessage.includes('occupé')) {
        // Optionally trigger a refresh of available time slots
        toastService.info('info.generic', t('booking.tryAnotherSlot'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(
      language === 'ro' ? 'ro-RO' : language === 'en' ? 'en-US' : `${language}-${language.toUpperCase()}`,
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar pentru desktop */}
      {isLoggedIn && (
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="w-64 border-r border-gray-200 dark:border-gray-700">
            <UserSidebar />
          </div>
        </div>
      )}

      {/* Mobile sidebar */}
      {isLoggedIn && sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header - doar pentru utilizatori logați */}
        {isLoggedIn && (
          <div className="lg:hidden sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('booking.newBooking')}</h1>
              <div className="w-6"></div>
            </div>
          </div>
        )}

        {/* Conținutul original */}
        <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Buton de întoarcere doar pentru utilizatori logați */}
            {isLoggedIn && (
              <button
                onClick={() => router.push('/dashboard')}
                className="hidden lg:flex mb-6 items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('booking.backToDashboard')}
              </button>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {t('booking.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('booking.subtitle')}
              </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-center">
                <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                  }`}>
                    1
                  </div>
                  <span className="ml-2 font-medium hidden sm:inline">{t('booking.steps.personalInfo')}</span>
                </div>
                
                <div className={`w-16 sm:w-24 h-1 mx-2 sm:mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                
                <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                  }`}>
                    2
                  </div>
                  <span className="ml-2 font-medium hidden sm:inline">{t('booking.steps.schedule')}</span>
                </div>
                
                <div className={`w-16 sm:w-24 h-1 mx-2 sm:mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                
                <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                  }`}>
                    3
                  </div>
                  <span className="ml-2 font-medium hidden sm:inline">{t('booking.steps.confirmation')}</span>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('booking.personalInfo')}
                  </h2>
                  
                  {isLoggedIn && userData && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {t('booking.dataFromAccount')}
                        {!formData.client_phone && ' ' + t('booking.pleaseAddPhone')}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <User className="inline w-4 h-4 mr-1" />
                      {t('booking.fullName')} *
                    </label>
                    <input
                      type="text"
                      name="client_name"
                      value={formData.client_name}
                      onChange={handleInputChange}
                      readOnly={isLoggedIn}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.client_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        isLoggedIn ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                      }`}
                      placeholder={t('booking.namePlaceholder')}
                    />
                    {errors.client_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.client_name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Mail className="inline w-4 h-4 mr-1" />
                      {t('common.email')} *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="client_email"
                        value={formData.client_email}
                        onChange={handleInputChange}
                        readOnly={isLoggedIn}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.client_email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          isLoggedIn ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                        }`}
                        placeholder={t('booking.emailPlaceholder')}
                      />
                      {checkingEmail && !isLoggedIn && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-b-2 border-gray-600"></div>
                        </div>
                      )}
                    </div>
                    {errors.client_email && (
                      <p className="mt-1 text-sm text-red-600">{errors.client_email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Phone className="inline w-4 h-4 mr-1" />
                      {t('common.phone')} *
                    </label>
                    <input
                      type="tel"
                      name="client_phone"
                      value={formData.client_phone}
                      onChange={handleInputChange}
                      readOnly={isLoggedIn && formData.client_phone !== ''}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.client_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        isLoggedIn && formData.client_phone !== '' ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                      }`}
                      placeholder={t('booking.phonePlaceholder')}
                    />
                    {errors.client_phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.client_phone}</p>
                    )}
                    {isLoggedIn && !formData.client_phone && (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        {t('booking.addPhoneToProfile')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => router.push(isLoggedIn ? '/dashboard' : '/')}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {t('booking.nextStep')} →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Schedule */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('booking.chooseDateTime')}
                  </h2>
                  
                  {/* Folosim TimeSlotPicker care respectă configurările din admin */}
                  <TimeSlotPicker
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onDateChange={setSelectedDate}
                    onTimeChange={setSelectedTime}
                  />
                  
                  {/* Afișăm erorile dacă există */}
                  {errors.interview_date && (
                    <p className="mt-2 text-sm text-red-600">{errors.interview_date}</p>
                  )}
                  {errors.interview_time && (
                    <p className="mt-2 text-sm text-red-600">{errors.interview_time}</p>
                  )}
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('booking.interviewType')}
                    </label>
                    <select
                      name="interview_type"
                      value={formData.interview_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="online">{t('booking.online')}</option>
                      <option value="in_person">{t('booking.inPerson')}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <FileText className="inline w-4 h-4 mr-1" />
                      {t('booking.additionalNotes')}
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder={t('booking.notesPlaceholder')}
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={handleBack}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      ← {t('common.back')}
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {t('booking.nextStep')} →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('booking.confirmBooking')}
                  </h2>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('booking.bookingSummary')}:</h3>
                    
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{t('common.name')}:</span>{' '}
                        <span className="text-gray-900 dark:text-gray-100">{formData.client_name}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{t('common.email')}:</span>{' '}
                        <span className="text-gray-900 dark:text-gray-100">{formData.client_email}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{t('common.phone')}:</span>{' '}
                        <span className="text-gray-900 dark:text-gray-100">{formData.client_phone}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{t('common.date')}:</span>{' '}
                        <span className="text-gray-900 dark:text-gray-100">
                          {formData.interview_date && formatDate(new Date(formData.interview_date))}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{t('common.time')}:</span>{' '}
                        <span className="text-gray-900 dark:text-gray-100">{formData.interview_time}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{t('common.type')}:</span>{' '}
                        <span className="text-gray-900 dark:text-gray-100">
                          {formData.interview_type === 'online' ? t('common.online') : t('common.inPerson')}
                        </span>
                      </p>
                      {formData.notes && (
                        <p className="text-sm">
                          <span className="font-medium text-gray-600 dark:text-gray-400">{t('common.notes')}:</span>{' '}
                          <span className="text-gray-900 dark:text-gray-100">{formData.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {t('booking.confirmationEmail').replace('{email}', formData.client_email)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={handleBack}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      ← {t('common.back')}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('common.processing')}...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          {t('booking.confirmBooking')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {step === 4 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t('booking.bookingConfirmed')}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t('booking.confirmationSent')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {t('booking.redirecting')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}