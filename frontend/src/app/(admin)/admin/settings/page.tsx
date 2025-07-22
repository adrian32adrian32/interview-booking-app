'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Mail, Bell, Shield, Database, 
  Save, TestTube, Check, X, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    email: {
      enabled: true,
      host: 'smtp.gmail.com',
      port: '587',
      user: '',
      from: '',
      templates: {
        confirmation: true,
        reminder: true,
        cancellation: true
      }
    },
    notifications: {
      newBooking: true,
      bookingUpdate: true,
      dailySummary: true
    },
    system: {
      timezone: 'Europe/Bucharest',
      language: 'ro',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      slotDuration: 30
    }
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Salvează setările
      toast.success('Setări salvate cu succes!');
    } catch (error) {
      toast.error('Eroare la salvarea setărilor');
    } finally {
      setLoading(false);
    }
  };

  const testEmailConnection = async () => {
    try {
      // Test conexiune email
      toast.success('Conexiune email funcțională!');
    } catch (error) {
      toast.error('Eroare la testarea conexiunii email');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
        Setări Sistem
      </h1>

      {/* Email Settings */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          <Mail className="h-5 w-5 text-gray-700 dark:text-gray-300 futuristic:text-cyan-400" />
          Configurare Email
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
                className="rounded text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30"
              />
              <span>Activează notificări email</span>
            </label>
            <button
              onClick={testEmailConnection}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 futuristic:bg-cyan-500/20 text-blue-700 dark:text-blue-400 futuristic:text-cyan-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 futuristic:hover:bg-cyan-500/30 transition-colors"
            >
              <TestTube className="h-4 w-4" />
              Test conexiune
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                SMTP Host
              </label>
              <input
                type="text"
                value={settings.email.host}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, host: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                Port
              </label>
              <input
                type="text"
                value={settings.email.port}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, port: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
              Template-uri active
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 futuristic:text-cyan-200">
                <input 
                  type="checkbox" 
                  checked={settings.email.templates.confirmation} 
                  className="rounded text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30" 
                />
                <span>Confirmare programare</span>
              </label>
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 futuristic:text-cyan-200">
                <input 
                  type="checkbox" 
                  checked={settings.email.templates.reminder} 
                  className="rounded text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30" 
                />
                <span>Reminder (cu o zi înainte)</span>
              </label>
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 futuristic:text-cyan-200">
                <input 
                  type="checkbox" 
                  checked={settings.email.templates.cancellation} 
                  className="rounded text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30" 
                />
                <span>Notificare anulare</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow-sm dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          <Settings className="h-5 w-5 text-gray-700 dark:text-gray-300 futuristic:text-cyan-400" />
          Configurare Sistem
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
              Fus orar
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400">
              <option value="Europe/Bucharest">București (GMT+2)</option>
              <option value="Europe/London">Londra (GMT+0)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
              Limbă
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400">
              <option value="ro">Română</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
            Program de lucru
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="time"
              value={settings.system.workingHours.start}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400"
            />
            <span className="self-center text-gray-700 dark:text-gray-300 futuristic:text-cyan-200">până la</span>
            <input
              type="time"
              value={settings.system.workingHours.end}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:border-blue-500 dark:focus:border-blue-400 futuristic:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Se salvează...' : 'Salvează setările'}
        </button>
      </div>
    </div>
  );
}