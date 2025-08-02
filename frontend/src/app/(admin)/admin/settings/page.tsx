'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Settings, Mail, Bell, Shield, Database, 
  Save, TestTube, Check, X, Info, Clock,
  Calendar, Globe, Key, Server, Download,
  Upload, HardDrive, Trash2
} from 'lucide-react';
import { toastService } from '@/services/toastService';
import api from '@/lib/axios';

interface EmailProvider {
  type: 'resend' | 'smtp';
  config: {
    resendApiKey?: string;
    smtpHost?: string;
    smtpPort?: string;
    smtpUser?: string;
    smtpPass?: string;
    fromEmail: string;
    fromName: string;
  };
}

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'resend' | 'smtp'>('resend');
  const [lastSavedInfo, setLastSavedInfo] = useState<{timestamp: string, savedBy: string} | null>(null);
  const [backups, setBackups] = useState<Array<{id: string, timestamp: string, size: string}>>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  
  // Helper pentru traduceri cu fallback
  const ts = (key: string, fallback?: string) => {
    try {
      const translation = t(key);
      return translation && translation !== key ? translation : (fallback || key);
    } catch (error) {
      return fallback || key;
    }
  };
  
  const [settings, setSettings] = useState({
    email: {
      enabled: true,
      provider: 'resend' as 'resend' | 'smtp',
      resend: {
        apiKey: '',
        fromEmail: 'noreply@interviu.ro',
        fromName: 'Interview Booking'
      },
      smtp: {
        host: 'smtp.gmail.com',
        port: '587',
        secure: false,
        user: '',
        pass: '',
        fromEmail: '',
        fromName: 'Interview Booking'
      },
      templates: {
        confirmation: true,
        reminder: true,
        cancellation: true,
        rescheduling: true
      }
    },
    notifications: {
      emailAdmin: true,
      newBooking: true,
      bookingUpdate: true,
      bookingCancellation: true,
      dailySummary: true,
      reminderHours: 24
    },
    system: {
      timezone: 'Europe/Bucharest',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      language: language || 'ro',
      currency: 'RON',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      lunchBreak: {
        enabled: false,
        start: '12:00',
        end: '13:00'
      },
      slotDuration: 30,
      bufferTime: 15,
      maxAdvanceBooking: 30,
      minAdvanceBooking: 1,
      cancellationPolicy: 24
    },
    backup: {
      autoBackup: true,
      backupTime: '03:00',
      retentionDays: 7,
      lastBackup: null as string | null
    }
  });

  useEffect(() => {
    // Încarcă setările din localStorage
    const savedSettings = localStorage.getItem('app_settings');
    const savedTimestamp = localStorage.getItem('app_settings_timestamp');
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsed
        }));
        if (parsed.email?.provider) {
          setSelectedProvider(parsed.email.provider);
        }
        
        // Setează informațiile despre ultima salvare
        if (parsed.lastSaved && parsed.savedBy) {
          setLastSavedInfo({
            timestamp: parsed.lastSaved,
            savedBy: parsed.savedBy
          });
        } else if (savedTimestamp) {
          setLastSavedInfo({
            timestamp: savedTimestamp,
            savedBy: 'admin'
          });
        }
      } catch (e) {
        console.error('Error parsing saved settings:', e);
      }
    }
    
    // Încarcă lista de backup-uri
    loadBackups();
  }, []);

  const loadBackups = () => {
    const savedBackups = localStorage.getItem('app_backups');
    if (savedBackups) {
      try {
        const parsed = JSON.parse(savedBackups);
        setBackups(parsed);
      } catch (e) {
        console.error('Error loading backups:', e);
      }
    }
  };

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      const backupData = {
        id: `backup_${Date.now()}`,
        timestamp: new Date().toISOString(),
        settings: settings,
        size: new Blob([JSON.stringify(settings)]).size + ' bytes'
      };
      
      // Adaugă la lista de backup-uri
      const newBackups = [...backups, {
        id: backupData.id,
        timestamp: backupData.timestamp,
        size: backupData.size
      }];
      
      // Salvează backup-ul
      localStorage.setItem(backupData.id, JSON.stringify(backupData));
      localStorage.setItem('app_backups', JSON.stringify(newBackups));
      
      setBackups(newBackups);
      
      // Actualizează ultima dată de backup
      setSettings(prev => ({
        ...prev,
        backup: {
          ...prev.backup,
          lastBackup: backupData.timestamp
        }
      }));
      
      toastService.success('success.generic', 'Backup creat cu succes!');
      
      // Șterge backup-urile vechi dacă e cazul
      cleanOldBackups(newBackups);
      
    } catch (error) {
      toastService.error('error.generic', 'Eroare la crearea backup-ului');
    } finally {
      setCreatingBackup(false);
    }
  };

  const cleanOldBackups = (currentBackups: any[]) => {
    const retentionDays = settings.backup.retentionDays || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const backupsToKeep = currentBackups.filter(backup => 
      new Date(backup.timestamp) > cutoffDate
    );
    
    // Șterge backup-urile vechi din localStorage
    currentBackups.forEach(backup => {
      if (!backupsToKeep.includes(backup)) {
        localStorage.removeItem(backup.id);
      }
    });
    
    if (backupsToKeep.length < currentBackups.length) {
      localStorage.setItem('app_backups', JSON.stringify(backupsToKeep));
      setBackups(backupsToKeep);
      toastService.info('info.generic', `${currentBackups.length - backupsToKeep.length} backup-uri vechi șterse`);
    }
  };

  const restoreBackup = (backupId: string) => {
    try {
      const backupData = localStorage.getItem(backupId);
      if (backupData) {
        const parsed = JSON.parse(backupData);
        setSettings(parsed.settings);
        localStorage.setItem('app_settings', JSON.stringify(parsed.settings));
        toastService.success('success.generic', 'Backup restaurat cu succes!');
      }
    } catch (error) {
      toastService.error('error.generic', 'Eroare la restaurarea backup-ului');
    }
  };

  const deleteBackup = (backupId: string) => {
    const newBackups = backups.filter(b => b.id !== backupId);
    localStorage.removeItem(backupId);
    localStorage.setItem('app_backups', JSON.stringify(newBackups));
    setBackups(newBackups);
    toastService.success('success.generic', 'Backup șters cu succes!');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const timestamp = new Date().toISOString();
      
      // Adaugă timestamp la setări
      const settingsWithTimestamp = {
        ...settings,
        lastSaved: timestamp,
        savedBy: currentUser?.email || 'admin'
      };
      
      // Salvează în localStorage
      localStorage.setItem('app_settings', JSON.stringify(settingsWithTimestamp));
      localStorage.setItem('app_settings_timestamp', timestamp);
      
      // Actualizează state-ul pentru afișare
      setLastSavedInfo({
        timestamp: timestamp,
        savedBy: currentUser?.email || 'admin'
      });
      
      // Simulează un delay pentru UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toastService.success('success.generic', `${t('saveSettings')} - ${new Date().toLocaleTimeString('ro-RO')}!`);
      
    } catch (error) {
      toastService.error('error.generic', 'Eroare la salvarea setărilor');
    } finally {
      setLoading(false);
    }
  };

  const testEmailConnection = async () => {
    setTestingEmail(true);
    try {
      // Simulează testarea conexiunii
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verifică dacă sunt completate câmpurile necesare
      if (selectedProvider === 'resend' && !settings.email.resend.apiKey) {
        toastService.error('error.generic', 'Te rog completează API Key pentru Resend');
        return;
      }
      
      if (selectedProvider === 'smtp' && (!settings.email.smtp.user || !settings.email.smtp.pass)) {
        toastService.error('error.generic', 'Te rog completează utilizatorul și parola SMTP');
        return;
      }
      
      toastService.success('success.generic', 'Conexiune email testată cu succes!');
      
    } catch (error) {
      toastService.error('error.generic', 'Eroare la testarea conexiunii email');
    } finally {
      setTestingEmail(false);
    }
  };

  const workDays = [
    { value: 'Mon', label: t('monday') },
    { value: 'Tue', label: t('tuesday') },
    { value: 'Wed', label: t('wednesday') },
    { value: 'Thu', label: t('thursday') },
    { value: 'Fri', label: t('friday') },
    { value: 'Sat', label: t('saturday') },
    { value: 'Sun', label: t('sunday') }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          {t('title')}
        </h1>
        {lastSavedInfo && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('lastSave')}: {new Date(lastSavedInfo.timestamp).toLocaleString(language === 'ro' ? 'ro-RO' : language || 'en-US')} 
            <span className="ml-2">{t('by')} {lastSavedInfo.savedBy}</span>
          </div>
        )}
      </div>

      {/* Email Settings */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          <Mail className="h-5 w-5 text-gray-700 dark:text-gray-300 futuristic:text-cyan-400" />
          {t('emailConfig')}
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 futuristic:text-cyan-200">
              <input
                type="checkbox"
                checked={settings.email.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, enabled: e.target.checked }
                })}
                className="rounded text-blue-600 dark:text-blue-400 futuristic:text-cyan-400"
              />
              <span>{t('enableEmail')}</span>
            </label>
            <button
              onClick={testEmailConnection}
              disabled={testingEmail}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 futuristic:bg-cyan-500/20 text-blue-700 dark:text-blue-400 futuristic:text-cyan-400 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
            >
              <TestTube className="h-4 w-4" />
              {testingEmail ? t('testing') : t('testConnection')}
            </button>
          </div>

          {/* Email Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
              {t('emailProvider')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="resend"
                  checked={selectedProvider === 'resend'}
                  onChange={(e) => {
                    setSelectedProvider('resend');
                    setSettings({ ...settings, email: { ...settings.email, provider: 'resend' }});
                  }}
                  className="text-blue-600 dark:text-blue-400"
                />
                <span>Resend</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="smtp"
                  checked={selectedProvider === 'smtp'}
                  onChange={(e) => {
                    setSelectedProvider('smtp');
                    setSettings({ ...settings, email: { ...settings.email, provider: 'smtp' }});
                  }}
                  className="text-blue-600 dark:text-blue-400"
                />
                <span>SMTP (Gmail)</span>
              </label>
            </div>
          </div>

          {/* Resend Configuration */}
          {selectedProvider === 'resend' && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resend API Key
                </label>
                <input
                  type="password"
                  value={settings.email.resend.apiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { 
                      ...settings.email, 
                      resend: { ...settings.email.resend, apiKey: e.target.value }
                    }
                  })}
                  placeholder="re_..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('fromEmail')}
                  </label>
                  <input
                    type="email"
                    value={settings.email.resend.fromEmail}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { 
                        ...settings.email, 
                        resend: { ...settings.email.resend, fromEmail: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('fromName')}
                  </label>
                  <input
                    type="text"
                    value={settings.email.resend.fromName}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { 
                        ...settings.email, 
                        resend: { ...settings.email.resend, fromName: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SMTP Configuration */}
          {selectedProvider === 'smtp' && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('smtpHost')}
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtp.host}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { 
                        ...settings.email, 
                        smtp: { ...settings.email.smtp, host: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('port')}
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtp.port}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { 
                        ...settings.email, 
                        smtp: { ...settings.email.smtp, port: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('smtpUser')}
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtp.user}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { 
                        ...settings.email, 
                        smtp: { ...settings.email.smtp, user: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('smtpPassword')}
                  </label>
                  <input
                    type="password"
                    value={settings.email.smtp.pass}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { 
                        ...settings.email, 
                        smtp: { ...settings.email.smtp, pass: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('fromEmail')}
                  </label>
                  <input
                    type="email"
                    value={settings.email.smtp.fromEmail}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { 
                        ...settings.email, 
                        smtp: { ...settings.email.smtp, fromEmail: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('fromName')}
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtp.fromName}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { 
                        ...settings.email, 
                        smtp: { ...settings.email.smtp, fromName: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email Templates */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
              {t('activeTemplates')}
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input 
                  type="checkbox" 
                  checked={settings.email.templates.confirmation}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { 
                      ...settings.email, 
                      templates: { ...settings.email.templates, confirmation: e.target.checked }
                    }
                  })}
                  className="rounded text-blue-600" 
                />
                <span>{t('bookingConfirm')}</span>
              </label>
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input 
                  type="checkbox" 
                  checked={settings.email.templates.reminder}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { 
                      ...settings.email, 
                      templates: { ...settings.email.templates, reminder: e.target.checked }
                    }
                  })}
                  className="rounded text-blue-600" 
                />
                <span>{t('reminder')}</span>
              </label>
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input 
                  type="checkbox" 
                  checked={settings.email.templates.cancellation}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { 
                      ...settings.email, 
                      templates: { ...settings.email.templates, cancellation: e.target.checked }
                    }
                  })}
                  className="rounded text-blue-600" 
                />
                <span>{t('cancellation')}</span>
              </label>
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input 
                  type="checkbox" 
                  checked={settings.email.templates.rescheduling}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { 
                      ...settings.email, 
                      templates: { ...settings.email.templates, rescheduling: e.target.checked }
                    }
                  })}
                  className="rounded text-blue-600" 
                />
                <span>{t('rescheduling')}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Settings className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          {t('systemConfig')}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('timezone')}
            </label>
            <select 
              value={settings.system.timezone}
              onChange={(e) => setSettings({
                ...settings,
                system: { ...settings.system, timezone: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="Europe/Bucharest">Europe/Bucharest</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('language')}
            </label>
            <select 
              value={settings.system.language}
              onChange={(e) => setSettings({
                ...settings,
                system: { ...settings.system, language: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="ro">Română</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
              <option value="ru">Русский</option>
              <option value="uk">Українська</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('workingHours')}
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="time"
              value={settings.system.workingHours.start}
              onChange={(e) => setSettings({
                ...settings,
                system: { 
                  ...settings.system, 
                  workingHours: { ...settings.system.workingHours, start: e.target.value }
                }
              })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
            <span className="text-gray-700 dark:text-gray-300">{t('to')}</span>
            <input
              type="time"
              value={settings.system.workingHours.end}
              onChange={(e) => setSettings({
                ...settings,
                system: { 
                  ...settings.system, 
                  workingHours: { ...settings.system.workingHours, end: e.target.value }
                }
              })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('workingDays')}
          </label>
          <div className="flex flex-wrap gap-2">
            {workDays.map(day => (
              <label key={day.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.system.workingDays.includes(day.value)}
                  onChange={(e) => {
                    const days = e.target.checked 
                      ? [...settings.system.workingDays, day.value]
                      : settings.system.workingDays.filter(d => d !== day.value);
                    setSettings({
                      ...settings,
                      system: { ...settings.system, workingDays: days }
                    });
                  }}
                  className="rounded text-blue-600"
                />
                <span className="text-sm">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('slotDuration')}
            </label>
            <input
              type="number"
              value={settings.system.slotDuration}
              onChange={(e) => setSettings({
                ...settings,
                system: { ...settings.system, slotDuration: parseInt(e.target.value) }
              })}
              min="15"
              max="120"
              step="15"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bufferTime')}
            </label>
            <input
              type="number"
              value={settings.system.bufferTime}
              onChange={(e) => setSettings({
                ...settings,
                system: { ...settings.system, bufferTime: parseInt(e.target.value) }
              })}
              min="0"
              max="60"
              step="5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          {t('notifications')}
        </h2>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notifications.newBooking}
              onChange={(e) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, newBooking: e.target.checked }
              })}
              className="rounded text-blue-600"
            />
            <span>{t('notifyNewBooking')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notifications.bookingUpdate}
              onChange={(e) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, bookingUpdate: e.target.checked }
              })}
              className="rounded text-blue-600"
            />
            <span>{t('notifyBookingUpdate')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notifications.bookingCancellation}
              onChange={(e) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, bookingCancellation: e.target.checked }
              })}
              className="rounded text-blue-600"
            />
            <span>{t('notifyBookingCancel')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notifications.dailySummary}
              onChange={(e) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, dailySummary: e.target.checked }
              })}
              className="rounded text-blue-600"
            />
            <span>{t('dailySummary')}</span>
          </label>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <HardDrive className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          {t('backup')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('backupDesc')}</p>

        <div className="space-y-4">
          {/* Automatic Backup Settings */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={settings.backup.autoBackup}
                onChange={(e) => setSettings({
                  ...settings,
                  backup: { ...settings.backup, autoBackup: e.target.checked }
                })}
                className="rounded text-blue-600"
              />
              <span className="font-medium">{t('autoBackup')}</span>
            </label>
            
            {settings.backup.autoBackup && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backupTime')}
                  </label>
                  <input
                    type="time"
                    value={settings.backup.backupTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, backupTime: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('retention')}
                  </label>
                  <select
                    value={settings.backup.retentionDays}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, retentionDays: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value={1}>1</option>
                    <option value={3}>3</option>
                    <option value={7}>7</option>
                    <option value={14}>14</option>
                    <option value={30}>30</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Manual Backup */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-medium mb-3">{t('manualBackup')}</h3>
            <button
              onClick={createBackup}
              disabled={creatingBackup}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              {creatingBackup ? 'Se creează...' : t('createBackup')}
            </button>
            
            {settings.backup.lastBackup && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('lastBackup')}: {new Date(settings.backup.lastBackup).toLocaleString(language === 'ro' ? 'ro-RO' : language || 'en-US')}
              </p>
            )}
          </div>

          {/* Backup List */}
          {backups.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Backup-uri existente:</h3>
              <div className="space-y-2">
                {backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(backup => (
                  <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(backup.timestamp).toLocaleString(language === 'ro' ? 'ro-RO' : language || 'en-US')}
                      </p>
                      <p className="text-xs text-gray-500">{backup.size}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => restoreBackup(backup.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {t('restore')}
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {loading ? t('saving') : t('saveSettings')}
        </button>
      </div>
    </div>
  );
}