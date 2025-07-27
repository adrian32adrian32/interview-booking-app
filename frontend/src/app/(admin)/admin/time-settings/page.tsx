'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Save, Trash2, Plus, AlertCircle, Ban } from 'lucide-react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { ro } from 'date-fns/locale';

interface TimeSlotConfig {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

interface BlockedDate {
  id: number;
  blocked_date: string;
  reason: string;
  blocked_by_name?: string;
}

const DAYS = [
  { value: 0, name: 'Duminică' },
  { value: 1, name: 'Luni' },
  { value: 2, name: 'Marți' },
  { value: 3, name: 'Miercuri' },
  { value: 4, name: 'Joi' },
  { value: 5, name: 'Vineri' },
  { value: 6, name: 'Sâmbătă' }
];

export default function TimeSettingsPage() {
  const [configs, setConfigs] = useState<TimeSlotConfig[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State pentru formular
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState(60);
  
  // State pentru blocare date
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockSingleDate, setBlockSingleDate] = useState('');
  const [blockType, setBlockType] = useState<'single' | 'range'>('single');
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    fetchConfigs();
    fetchBlockedDates();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get('/time-slots/config');
      if (response.data.success) {
        setConfigs(response.data.config);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast.error('Eroare la încărcarea configurărilor');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const response = await axios.get('/time-slots/blocked-dates');
      if (response.data.success) {
        setBlockedDates(response.data.blockedDates);
      }
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await axios.post('/time-slots/config', {
        dayOfWeek: selectedDay,
        startTime,
        endTime,
        slotDuration
      });
      
      toast.success('Configurare salvată cu succes');
      fetchConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Eroare la salvarea configurării');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockDate = async () => {
    if (blockType === 'single') {
      if (!blockSingleDate || !blockReason.trim()) {
        toast.error('Selectează o dată și adaugă un motiv');
        return;
      }

      try {
        await axios.post('/time-slots/block-date', {
          date: blockSingleDate,
          reason: blockReason
        });
        
        toast.success('Zi blocată cu succes');
        setBlockSingleDate('');
        setBlockReason('');
        fetchBlockedDates();
      } catch (error) {
        console.error('Error blocking date:', error);
        toast.error('Eroare la blocarea zilei');
      }
    } else {
      // Blocare interval de date
      if (!blockStartDate || !blockEndDate || !blockReason.trim()) {
        toast.error('Selectează intervalul de date și adaugă un motiv');
        return;
      }

      if (new Date(blockStartDate) > new Date(blockEndDate)) {
        toast.error('Data de început trebuie să fie înainte de data de sfârșit');
        return;
      }

      try {
        // Calculăm toate zilele din interval
        const start = new Date(blockStartDate);
        const end = new Date(blockEndDate);
        const dates = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(format(new Date(d), 'yyyy-MM-dd'));
        }

        // Trimitem toate datele pentru blocare
        for (const date of dates) {
          await axios.post('/time-slots/block-date', {
            date: date,
            reason: blockReason
          });
        }
        
        toast.success(`${dates.length} zile blocate cu succes`);
        setBlockStartDate('');
        setBlockEndDate('');
        setBlockReason('');
        fetchBlockedDates();
      } catch (error) {
        console.error('Error blocking dates:', error);
        toast.error('Eroare la blocarea zilelor');
      }
    }
  };

  const handleUnblockDate = async (date: string) => {
    try {
      await axios.delete(`/time-slots/block-date/${date}`);
      toast.success('Zi deblocată cu succes');
      fetchBlockedDates();
    } catch (error) {
      console.error('Error unblocking date:', error);
      toast.error('Eroare la deblocarea zilei');
    }
  };

  const getConfigForDay = (dayOfWeek: number) => {
    return configs.find(c => c.day_of_week === dayOfWeek);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          Setări Program Interviuri
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
          Configurează zilele și orele disponibile pentru programări
        </p>
      </div>

      {/* Program pe zile */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 rounded-lg border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Program săptămânal
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Formular configurare */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                Zi săptămână
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
              >
                {DAYS.map(day => (
                  <option key={day.value} value={day.value}>{day.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                Oră început
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                Oră sfârșit
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                Durată slot (min)
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
              >
                <option value={30}>30 minute</option>
                <option value={45}>45 minute</option>
                <option value={60}>60 minute</option>
                <option value={90}>90 minute</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvează
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Afișare configurări curente */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-3">
              Configurări curente:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
              {DAYS.map(day => {
                const config = getConfigForDay(day.value);
                const isConfigured = !!config;
                
                return (
                  <div
                    key={day.value}
                    className={`p-3 rounded-lg text-center ${
                      isConfigured
                        ? 'bg-green-50 dark:bg-green-900/20 futuristic:bg-green-900/30 border border-green-200 dark:border-green-800 futuristic:border-green-500/30'
                        : 'bg-gray-50 dark:bg-gray-700/50 futuristic:bg-gray-800/30 border border-gray-200 dark:border-gray-600 futuristic:border-gray-500/30'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
                      {day.name}
                    </div>
                    {config ? (
                      <div className="text-xs text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70 mt-1">
                        {config.start_time.slice(0, 5)} - {config.end_time.slice(0, 5)}
                        <br />
                        {config.slot_duration} min
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-500 futuristic:text-gray-500 mt-1">
                        Liber
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Zile blocate */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 rounded-lg border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 flex items-center">
            <Ban className="h-5 w-5 mr-2" />
            Zile blocate (sărbători, concedii, etc.)
          </h2>
        </div>
        
        <div className="p-6">
          {/* Selector tip blocare */}
          <div className="mb-4">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="single"
                  checked={blockType === 'single'}
                  onChange={(e) => setBlockType('single')}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">
                  O singură zi
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="range"
                  checked={blockType === 'range'}
                  onChange={(e) => setBlockType('range')}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">
                  Interval de zile
                </span>
              </label>
            </div>
          </div>

          {/* Formular blocare dată */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {blockType === 'single' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={blockSingleDate}
                  onChange={(e) => setBlockSingleDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                    Data început
                  </label>
                  <input
                    type="date"
                    value={blockStartDate}
                    onChange={(e) => setBlockStartDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                    Data sfârșit
                  </label>
                  <input
                    type="date"
                    value={blockEndDate}
                    onChange={(e) => setBlockEndDate(e.target.value)}
                    min={blockStartDate || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
                  />
                </div>
              </>
            )}
            
            <div className={blockType === 'single' ? '' : 'md:col-span-1'}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                Motiv
              </label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ex: Sărbătoare legală, Concediu, etc."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleBlockDate}
                className="w-full px-4 py-2 bg-red-600 dark:bg-red-700 futuristic:bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 futuristic:hover:bg-red-700 flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Blochează {blockType === 'single' ? 'zi' : 'zile'}
              </button>
            </div>
          </div>
          
          {/* Lista zile blocate */}
          {blockedDates.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-2">
                Zile blocate curente:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {blockedDates.map((blocked) => (
                  <div
                    key={blocked.id}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 futuristic:bg-red-900/30 border border-red-200 dark:border-red-800 futuristic:border-red-500/30 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
                        {format(new Date(blocked.blocked_date), 'dd MMMM yyyy', { locale: ro })}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
                        {blocked.reason}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblockDate(blocked.blocked_date)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/30 rounded"
                      title="Deblochează"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
              <Ban className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nu sunt zile blocate</p>
            </div>
          )}
        </div>
      </div>

      {/* Notă informativă */}
      <div className="bg-blue-50 dark:bg-blue-900/20 futuristic:bg-purple-800/20 border border-blue-200 dark:border-blue-800 futuristic:border-purple-500/30 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400 dark:text-blue-300 futuristic:text-cyan-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 futuristic:text-cyan-200">
              Informații importante
            </h3>
            <div className="mt-1 text-sm text-blue-700 dark:text-blue-300 futuristic:text-cyan-300/80">
              <ul className="list-disc list-inside space-y-1">
                <li>Weekend-urile sunt automat blocate dacă nu sunt configurate</li>
                <li>Modificările se aplică imediat pentru programările noi</li>
                <li>Programările existente nu sunt afectate</li>
                <li>Utilizatorii văd doar sloturile disponibile în calendar</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}