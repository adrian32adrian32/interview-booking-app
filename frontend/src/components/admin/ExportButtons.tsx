'use client';

import { Download } from 'lucide-react';
import axios from '@/lib/axios';

interface ExportButtonsProps {
  type: 'bookings' | 'users';
  filters?: any;
}

export default function ExportButtons({ type, filters }: ExportButtonsProps) {
  const handleExportExcel = async () => {
    try {
      const response = await axios.get(`/export/${type}/excel`, {
        params: filters,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`/export/${type}/csv`, {
        params: filters,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportExcel}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        Export Excel
      </button>
      
      <button
        onClick={handleExportCSV}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
    </div>
  );
}
