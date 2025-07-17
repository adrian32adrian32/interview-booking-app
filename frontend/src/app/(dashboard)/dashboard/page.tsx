'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/axios';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    nextBooking: null as any,
    totalBookings: 0,
    documentsUploaded: 0,
    profileComplete: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Încarcă programările
      const bookingsResponse = await api.get('/bookings/my-bookings');
      const bookings = bookingsResponse.data.data;
      
      // Găsește următoarea programare
      const futureBookings = bookings.filter((b: any) => 
        new Date(b.date) >= new Date() && b.status === 'confirmed'
      );
      const nextBooking = futureBookings.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0];

      setStats({
        nextBooking,
        totalBookings: bookings.length,
        documentsUploaded: 0, // TODO: implement documents count
        profileComplete: user?.emailVerified || false
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Bine ai venit, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Aici poți gestiona programările tale și documentele necesare pentru interviu.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-10 w-10 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Programări totale</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FileText className="h-10 w-10 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Documente încărcate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.documentsUploaded}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            {stats.profileComplete ? (
              <CheckCircle className="h-10 w-10 text-green-600" />
            ) : (
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            )}
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profil</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.profileComplete ? 'Complet' : 'Incomplet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next booking */}
      {stats.nextBooking && (
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Următoarea programare
              </h2>
              <div className="flex items-center space-x-4 text-blue-700">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  {format(new Date(stats.nextBooking.date), 'EEEE, d MMMM yyyy', { locale: ro })}
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  {stats.nextBooking.start_time}
                </div>
              </div>
            </div>
            <Link
              href="/bookings"
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              Vezi detalii
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/bookings/new"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
            Programează un interviu
          </h3>
          <p className="text-gray-600 mb-4">
            Alege data și ora care ți se potrivește cel mai bine.
          </p>
          <span className="text-blue-600 font-medium flex items-center">
            Programează acum
            <ArrowRight className="h-4 w-4 ml-1" />
          </span>
        </Link>

        <Link
          href="/profile"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
            Completează profilul
          </h3>
          <p className="text-gray-600 mb-4">
            Încarcă documentele necesare pentru interviu.
          </p>
          <span className="text-blue-600 font-medium flex items-center">
            Mergi la profil
            <ArrowRight className="h-4 w-4 ml-1" />
          </span>
        </Link>
      </div>

      {/* Important notices */}
      {!user?.emailVerified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-900">
                Verifică-ți adresa de email
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Te rugăm să îți verifici adresa de email pentru a putea folosi toate funcționalitățile aplicației.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}