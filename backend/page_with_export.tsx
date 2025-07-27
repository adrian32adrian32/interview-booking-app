'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { Calendar, Clock, User, Mail, Phone, Search, Filter, Download, Eye, Edit, Trash2, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ExportButtons from '@/components/admin/ExportButtons';

// ... (păstrează toate interface-urile și funcțiile existente)

export default function AdminBookingsPage() {
  // ... (păstrează toate state-urile și funcțiile existente)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestionare Programări
        </h1>
        
        <div className="flex gap-4">
          <ExportButtons type="bookings" filters={{ status: filterStatus }} />
          
          <button
            onClick={() => router.push('/admin/bookings/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Programare Nouă
          </button>
        </div>
      </div>

      {/* ... (păstrează restul componentei) */}
    </div>
  );
}
