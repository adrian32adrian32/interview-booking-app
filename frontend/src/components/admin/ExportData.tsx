'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from '@/lib/axios';
import { toastService } from '@/services/toastService';
import { Download, FileSpreadsheet, FileJson, Calendar, Users, Loader2 } from 'lucide-react';

interface ExportDataProps {
  className?: string;
}

export default function ExportData({ className = '' }: ExportDataProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const handleExport = async (type: 'bookings' | 'users', format: 'csv' | 'json') => {
    setExporting(`${type}-${format}`);
    
    try {
      let url = `/export/${type}/${format}`;
      const params = new URLSearchParams();
      
      if (type === 'bookings' && dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (type === 'bookings' && dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        responseType: 'blob'
      });

      // Creează link pentru download
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Generează numele fișierului
      const date = new Date().toISOString().split('T')[0];
      link.download = `${type}_${date}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toastService.success('success.generic', `Export ${type} ${format.toUpperCase()} realizat cu succes!`);
    } catch (error: any) {
      console.error('Export error:', error);
      toastService.error('error.generic', error.response?.data?.message || 'Eroare la export');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 rounded-lg p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-6 flex items-center">
        <Download className="w-5 h-5 mr-2" />
        Export Date
      </h2>

      <div className="space-y-6">
        {/* Export Bookings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Programări
          </h3>
          
          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                De la:
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent bg-white dark:bg-gray-700 futuristic:bg-purple-800/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                Până la:
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 focus:border-transparent bg-white dark:bg-gray-700 futuristic:bg-purple-800/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleExport('bookings', 'csv')}
              disabled={exporting === 'bookings-csv'}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg text-gray-700 dark:text-gray-300 futuristic:text-cyan-200 bg-white dark:bg-gray-700 futuristic:bg-purple-800/30 hover:bg-gray-50 dark:hover:bg-gray-600 futuristic:hover:bg-purple-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting === 'bookings-csv' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </button>
            
            <button
              onClick={() => handleExport('bookings', 'json')}
              disabled={exporting === 'bookings-json'}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg text-gray-700 dark:text-gray-300 futuristic:text-cyan-200 bg-white dark:bg-gray-700 futuristic:bg-purple-800/30 hover:bg-gray-50 dark:hover:bg-gray-600 futuristic:hover:bg-purple-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting === 'bookings-json' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4 mr-2" />
              )}
              Export JSON
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Utilizatori
          </h3>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleExport('users', 'csv')}
              disabled={exporting === 'users-csv'}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg text-gray-700 dark:text-gray-300 futuristic:text-cyan-200 bg-white dark:bg-gray-700 futuristic:bg-purple-800/30 hover:bg-gray-50 dark:hover:bg-gray-600 futuristic:hover:bg-purple-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting === 'users-csv' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </button>
            
            <button
              onClick={() => handleExport('users', 'json')}
              disabled={exporting === 'users-json'}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg text-gray-700 dark:text-gray-300 futuristic:text-cyan-200 bg-white dark:bg-gray-700 futuristic:bg-purple-800/30 hover:bg-gray-50 dark:hover:bg-gray-600 futuristic:hover:bg-purple-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting === 'users-json' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4 mr-2" />
              )}
              Export JSON
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 futuristic:bg-cyan-500/10 border border-blue-200 dark:border-blue-800 futuristic:border-cyan-500/30 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200 futuristic:text-cyan-200">
          <strong>Notă:</strong> Exportul va include toate datele vizibile conform filtrelor selectate. 
          Fișierele CSV pot fi deschise în Excel sau Google Sheets.
        </p>
      </div>
    </div>
  );
}