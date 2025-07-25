'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  first_name?: string;
  emailVerified?: boolean;
}

interface Booking {
  id: number;
  client_name: string;
  client_email: string;
  interview_date: string;
  interview_time: string;
  status: string;
  interview_type: string;
}

interface Document {
  id: number;
  type: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get next booking
  const getNextBooking = () => {
    const now = new Date();
    const futureBookings = bookings
      .filter(b => {
        const bookingDate = new Date(`${b.interview_date} ${b.interview_time}`);
        return bookingDate > now && b.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.interview_date} ${a.interview_time}`);
        const dateB = new Date(`${b.interview_date} ${b.interview_time}`);
        return dateA.getTime() - dateB.getTime();
      });
    
    return futureBookings[0] || null;
  };

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
        
        // Check if user is admin and redirect
        if (data.user.role === 'admin') {
          router.push('/admin/dashboard');
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Eroare la încărcarea datelor utilizatorului');
    }
  };

  // Fetch user bookings
  const fetchUserBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('Fetching user bookings...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('My bookings response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('My bookings error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch bookings');
      }

      const data = await response.json();
      console.log('My bookings data:', data);
      
      if (data.success && data.bookings) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Nu afișăm eroare pentru bookings, doar logăm
    }
  };

  // Fetch user documents
  const fetchUserDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/my-documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.documents) {
          setDocuments(data.documents);
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Nu afișăm eroare pentru documents, doar logăm
    }
  };

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchUserData();
      await Promise.all([
        fetchUserBookings(),
        fetchUserDocuments()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-900 dark:text-red-200">Eroare</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const nextBooking = getNextBooking();
  const stats = {
    nextBooking,
    totalBookings: bookings.length,
    documentsUploaded: documents.length,
    profileComplete: documents.length >= 2 // Considerăm profilul complet dacă are cel puțin 2 documente
  };

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Bine ai venit, {user?.firstName || user?.first_name || user?.username || 'Utilizator'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Aici poți gestiona programările tale și documentele necesare pentru interviu.
        </p>
      </div>

      {/* Next booking alert */}
      {nextBooking && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Următoarea programare
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {new Date(nextBooking.interview_date).toLocaleDateString('ro-RO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} la ora {nextBooking.interview_time} - {nextBooking.interview_type}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-10 w-10 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Programări totale</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <FileText className="h-10 w-10 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Documente încărcate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.documentsUploaded}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            {stats.profileComplete ? (
              <CheckCircle className="h-10 w-10 text-green-600" />
            ) : (
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            )}
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Profil</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.profileComplete ? 'Complet' : 'Incomplet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/booking"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600">
            Programează un interviu
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Alege data și ora care ți se potrivește cel mai bine.
          </p>
          <span className="text-blue-600 font-medium flex items-center">
            Programează acum
            <ArrowRight className="h-4 w-4 ml-1" />
          </span>
        </Link>

        <Link
          href="/documents"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600">
            Încarcă documente
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Încarcă documentele necesare pentru interviu.
          </p>
          <span className="text-blue-600 font-medium flex items-center">
            Mergi la documente
            <ArrowRight className="h-4 w-4 ml-1" />
          </span>
        </Link>
      </div>

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Programări recente</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {bookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(booking.interview_date).toLocaleDateString('ro-RO')} - {booking.interview_time}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {booking.interview_type} - {booking.status === 'confirmed' ? 'Confirmat' : 
                        booking.status === 'pending' ? 'În așteptare' : 
                        booking.status === 'cancelled' ? 'Anulat' : booking.status}
                    </p>
                  </div>
                  <Link 
                    href="/bookings"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Vezi detalii
                  </Link>
                </div>
              ))}
            </div>
            {bookings.length > 3 && (
              <Link 
                href="/bookings"
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                Vezi toate programările
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Important notices */}
      {!stats.profileComplete && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                Completează-ți profilul
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Te rugăm să încarci toate documentele necesare pentru a finaliza procesul de aplicare.
              </p>
              <Link 
                href="/documents"
                className="mt-2 inline-flex items-center text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:underline"
              >
                Încarcă documente
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}