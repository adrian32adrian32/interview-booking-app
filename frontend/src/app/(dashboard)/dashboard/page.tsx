import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

async function checkUserAndRedirect() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('user');
  
  if (!userCookie) {
    redirect('/login');
  }
  
  try {
    const user = JSON.parse(userCookie.value);
    
    // Dacă e admin, redirect la admin dashboard
    if (user.role === 'admin' || user.email === 'admin@example.com') {
      redirect('/admin/dashboard');
    }
    
    return user;
  } catch (e) {
    console.error('Error parsing user cookie:', e);
    redirect('/login');
  }
}

export default async function DashboardPage() {
  // Server-side check și redirect
  const user = await checkUserAndRedirect();
  
  // Date mock pentru stats
  const stats = {
    nextBooking: null,
    totalBookings: 0,
    documentsUploaded: 0,
    profileComplete: user?.emailVerified || false
  };

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Bine ai venit, {user?.firstName || user?.first_name || user?.username || 'Utilizator'}!
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

      {/* Debug info - pentru development */}
      <div className="mt-8 p-4 bg-gray-100 rounded text-xs text-gray-600">
        <p><strong>Debug Info (Server-Side):</strong></p>
        <p>User Role: <strong>{user?.role}</strong></p>
        <p>User Email: <strong>{user?.email}</strong></p>
        <p>This is the USER dashboard (not admin)</p>
      </div>
    </div>
  );
}