import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Clock, User, Mail, Phone, Video, MapPin, FileText } from 'lucide-react';
import api from '@/lib/axios';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingFormData {
  client_name: string;
  client_email: string;
  client_phone: string;
  interview_type: 'online' | 'in-person';
  date: string;
  time_slot: string;
  notes: string;
}

const BookingForm: React.FC = () => {
  const { t } = useLanguage(); // Mutat aici la începutul componentei
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<BookingFormData>({
    client_name: '',
    client_email: '',
    client_phone: '',
    interview_type: 'online',
    date: '',
    time_slot: '',
    notes: ''
  });

  // Generează următoarele 30 de zile pentru calendar
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekend
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date);
      }
    }
    
    return dates;
  };

  const availableDates = generateDates();

  // Încarcă sloturile disponibile când se selectează o dată
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async (date: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/time-slots/available/${date}`);
      
      const slots = response.data.allSlots.map((time: string) => ({
        time,
        available: response.data.availableSlots.includes(time)
      }));
      
      setTimeSlots(slots);
    } catch (err) {
      setError('Eroare la încărcarea sloturilor disponibile');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setSelectedDate(formattedDate);
    setFormData({ ...formData, date: formattedDate, time_slot: '' });
    setCurrentStep(2);
  };

  const handleTimeSelect = (time: string) => {
    setFormData({ ...formData, time_slot: time });
    setCurrentStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      const response = await api.post('/bookings', formData);
      
      if (response.data.success || response.status === 201) {
        setSuccess(true);
        // Reset form
        setFormData({
          client_name: '',
          client_email: '',
          client_phone: '',
          interview_type: 'online',
          date: '',
          time_slot: '',
          notes: ''
        });
        setCurrentStep(1);
        setSelectedDate('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Eroare la trimiterea programării');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const days = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      year: date.getFullYear()
    };
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Programare confirmată!</h2>
          <p className="text-green-600 mb-6">
            Veți primi un email de confirmare în curând la adresa furnizată.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setCurrentStep(1);
            }}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Fă o nouă programare
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Progress Steps */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                <Calendar className="w-5 h-5" />
              </div>
              <span className="ml-3 font-medium">{t('booking.alege_data')}</span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <span className="ml-3 font-medium">{t('booking.alege_ora')}</span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-4 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            
            <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 3 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <span className="ml-3 font-medium">{t('booking.date_personale')}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Select Date */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Selectează data pentru interviu</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {availableDates.map((date, index) => {
                  const formatted = formatDate(date);
                  const dateString = date.toISOString().split('T')[0];
                  const isSelected = selectedDate === dateString;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(date)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-sm text-gray-600">{formatted.day}</div>
                      <div className="text-2xl font-bold">{formatted.date}</div>
                      <div className="text-sm text-gray-600">{formatted.month}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Select Time */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">
                Selectează ora pentru {new Date(selectedDate).toLocaleDateString('ro-RO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Se încarcă sloturile disponibile...</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && handleTimeSelect(slot.time)}
                      disabled={!slot.available}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.time_slot === slot.time
                          ? 'border-blue-600 bg-blue-50'
                          : slot.available
                          ? 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <Clock className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-sm font-medium">{slot.time}</span>
                    </button>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => setCurrentStep(1)}
                className="mt-6 text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Înapoi la selectare dată
              </button>
            </div>
          )}

          {/* Step 3: Personal Details */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold mb-6">Completează datele personale</h2>
              
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Data selectată:</strong> {new Date(selectedDate).toLocaleDateString('ro-RO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  <br />
                  <strong>Ora selectată:</strong> {formData.time_slot}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Nume complet
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ex: Ion Popescu"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ex: ion.popescu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Telefon
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ex: 0722 123 456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tip interviu
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.interview_type === 'online'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-400'
                    }`}>
                      <input
                        type="radio"
                        name="interview_type"
                        value="online"
                        checked={formData.interview_type === 'online'}
                        onChange={(e) => setFormData({ ...formData, interview_type: e.target.value as 'online' | 'in-person' })}
                        className="sr-only"
                      />
                      <Video className="w-5 h-5 mr-2" />
                      <span className="font-medium">{t('booking.online')}</span>
                    </label>
                    
                    <label className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.interview_type === 'in-person'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-400'
                    }`}>
                      <input
                        type="radio"
                        name="interview_type"
                        value="in-person"
                        checked={formData.interview_type === 'in-person'}
                        onChange={(e) => setFormData({ ...formData, interview_type: e.target.value as 'online' | 'in-person' })}
                        className="sr-only"
                      />
                      <MapPin className="w-5 h-5 mr-2" />
                      <span className="font-medium">În persoană</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Note adiționale (opțional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informații suplimentare despre interviu..."
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Înapoi la selectare oră
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    loading
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Se trimite...' : 'Confirmă programarea'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingForm;