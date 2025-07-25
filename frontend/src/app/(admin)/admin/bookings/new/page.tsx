'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Video,
  MapPin,
  FileText,
  ArrowLeft,
  Save,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    interview_date: format(new Date(), 'yyyy-MM-dd'),
    interview_time: '',
    interview_type: 'online' as 'online' | 'in_person',
    notes: '',
    send_confirmation: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generează toate sloturile de timp posibile
  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ time, available: true });
      }
    }
    return slots;
  };

  useEffect(() => {
    if (formData.interview_date) {
      checkAvailability();
    }
  }, [formData.interview_date]);

  const checkAvailability = async () => {
    setCheckingAvailability(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/bookings/time-slots/available/${formData.interview_date}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const allSlots = generateTimeSlots();
        
        // Marchează sloturile ocupate
        const updatedSlots = allSlots.map(slot => ({
          ...slot,
          available: data.availableSlots?.includes(slot.time) !== false
        }));
        
        setAvailableSlots(updatedSlots);
      } else {
        // În caz de eroare, afișează toate sloturile ca disponibile
        setAvailableSlots(generateTimeSlots());
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailableSlots(generateTimeSlots());
    } finally {
      setCheckingAvailability(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Numele este obligatoriu';
    }

    if (!formData.client_email.trim()) {
      newErrors.client_email = 'Email-ul este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      newErrors.client_email = 'Email invalid';
    }

    if (!formData.client_phone.trim()) {
      newErrors.client_phone = 'Telefonul este obligatoriu';
    } else if (!/^(\+40|0)[0-9]{9}$/.test(formData.client_phone.replace(/\s/g, ''))) {
      newErrors.client_phone = 'Număr de telefon invalid';
    }

    if (!formData.interview_date) {
      newErrors.interview_date = 'Data este obligatorie';
    }

    if (!formData.interview_time) {
      newErrors.interview_time = 'Ora este obligatorie';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Te rog completează toate câmpurile obligatorii');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          status: 'confirmed', // Pentru programări create din admin, le setăm direct ca confirmate
          created_by: 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create booking');
      }

      toast.success('Programare creată cu succes!');
      
      if (formData.send_confirmation) {
        toast.success('Email de confirmare va fi trimis clientului!');
      }
      
      router.push('/admin/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error instanceof Error ? error.message : 'Eroare la crearea programării');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Datele minime și maxime pentru calendar
  const minDate = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 90), 'yyyy-MM-dd'); // 90 zile în viitor

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/bookings')}
          className="flex items-center text-gray-600 dark:text-gray-400 futuristic:text-cyan-400 hover:text-gray-900 dark:hover:text-gray-100 futuristic:hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi la programări
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Programare Nouă</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
            Completează formularul pentru a crea o nouă programare
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informații Client */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-4">Informații Client</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                  Nume complet *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  <input
                    type="text"
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 ${
                      errors.client_name 
                        ? 'border-red-300 dark:border-red-600 futuristic:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30'
                    } bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100`}
                    placeholder="Ex: Ion Popescu"
                  />
                </div>
                {errors.client_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  <input
                    type="email"
                    name="client_email"
                    value={formData.client_email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 ${
                      errors.client_email 
                        ? 'border-red-300 dark:border-red-600 futuristic:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30'
                    } bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100`}
                    placeholder="email@exemplu.ro"
                  />
                </div>
                {errors.client_email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client_email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                  Telefon *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  <input
                    type="tel"
                    name="client_phone"
                    value={formData.client_phone}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 ${
                      errors.client_phone 
                        ? 'border-red-300 dark:border-red-600 futuristic:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30'
                    } bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100`}
                    placeholder="0722123456"
                  />
                </div>
                {errors.client_phone && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client_phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                  Tip interviu *
                </label>
                <select
                  name="interview_type"
                  value={formData.interview_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
                >
                  <option value="online">💻 Online (Video Call)</option>
                  <option value="in_person">🏢 În persoană (La birou)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Programare */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-4">Detalii Programare</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                  Data *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  <input
                    type="date"
                    name="interview_date"
                    value={formData.interview_date}
                    onChange={handleChange}
                    min={minDate}
                    max={maxDate}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 ${
                      errors.interview_date 
                        ? 'border-red-300 dark:border-red-600 futuristic:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30'
                    } bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100`}
                  />
                </div>
                {errors.interview_date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.interview_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                  Ora *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
                  <select
                    name="interview_time"
                    value={formData.interview_time}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 ${
                      errors.interview_time 
                        ? 'border-red-300 dark:border-red-600 futuristic:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30'
                    } bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100`}
                    disabled={checkingAvailability}
                  >
                    <option value="">Selectează ora</option>
                    {availableSlots.map(slot => (
                      <option 
                        key={slot.time} 
                        value={slot.time}
                        disabled={!slot.available}
                      >
                        {slot.time} {!slot.available && '(Ocupat)'}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.interview_time && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.interview_time}</p>
                )}
                {checkingAvailability && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">Se verifică disponibilitatea...</p>
                )}
              </div>
            </div>
          </div>

          {/* Note adiționale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
              Note adiționale
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-purple-400 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
                placeholder="Informații adiționale despre programare..."
              />
            </div>
          </div>

          {/* Opțiuni */}
          <div className="border-t dark:border-gray-700 futuristic:border-purple-500/30 pt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="send_confirmation"
                checked={formData.send_confirmation}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 futuristic:text-purple-400 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-purple-400 border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 futuristic:text-cyan-200">
                Trimite email de confirmare clientului
              </span>
            </label>
          </div>

          {/* Notă informativă */}
          <div className="bg-blue-50 dark:bg-blue-900/20 futuristic:bg-purple-800/20 border border-blue-200 dark:border-blue-800 futuristic:border-purple-500/30 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 dark:text-blue-300 futuristic:text-cyan-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 futuristic:text-cyan-200">
                  Notă importantă
                </h3>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300 futuristic:text-cyan-300/80">
                  Programările create din panoul de administrare sunt automat confirmate.
                  Clientul va primi un email de confirmare cu detaliile programării.
                </p>
              </div>
            </div>
          </div>

          {/* Butoane acțiune */}
          <div className="flex justify-end space-x-3 pt-6 border-t dark:border-gray-700 futuristic:border-purple-500/30">
            <button
              type="button"
              onClick={() => router.push('/admin/bookings')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg text-gray-700 dark:text-gray-300 futuristic:text-cyan-200 hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/20"
              disabled={loading}
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Se creează...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Creează Programare
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}