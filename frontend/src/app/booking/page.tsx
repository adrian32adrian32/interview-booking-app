'use client';

import React from 'react';
import BookingForm from '@/components/booking/BookingForm';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Programare Interviu</h1>
          <p className="mt-2 text-gray-600">
            Alege data și ora care ți se potrivește cel mai bine pentru interviu
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Flexibilitate maximă</h3>
            <p className="text-gray-600">
              Alege din mai multe date disponibile în următoarele 30 de zile
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Confirmare instantă</h3>
            <p className="text-gray-600">
              Primești confirmarea programării imediat pe email
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Proces simplu</h3>
            <p className="text-gray-600">
              Doar 3 pași simpli pentru a-ți programa interviul
            </p>
          </div>
        </div>

        {/* Booking Form */}
        <BookingForm />
      </div>
    </div>
  );
}