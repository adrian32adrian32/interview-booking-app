'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
  documents_count: number;
  bookings_count: number;
}

interface Booking {
  id: string;
  user_id: string;
  email: string;
  username: string;
  date: string;
  time: string;
  status: string;
}

interface Slot {
  id: string;
  date: string;
  time: string;
  max_capacity: number;
  current_bookings: number;
  is_available: boolean;
  bookings?: Array<{
  booking_id: string;
  user_id: string;
  username: string;
  email: string;
}>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'slots') {
      loadSlots();
    }
  }, [selectedDate, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all data
      const [usersRes, bookingsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api'}/admin/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api'}/admin/bookings`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      const usersData = await usersRes.json();
      const bookingsData = await bookingsRes.json();

      if (usersData.success) setUsers(usersData.data);
      if (bookingsData.success) setBookings(bookingsData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api'}/admin/slots?date=${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setSlots(data.data);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const handleAddSlots = async () => {
    const startDate = prompt('Data început (YYYY-MM-DD):');
    const endDate = prompt('Data sfârșit (YYYY-MM-DD):');
    
    if (!startDate || !endDate) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api'}/admin/slots/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            startDate,
            endDate,
            times: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
            maxCapacity: 2,
            excludeWeekends: true
          })
        }
      );
      
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        loadSlots();
      }
    } catch (error) {
      console.error('Error adding slots:', error);
      alert('Eroare la adăugarea sloturilor!');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Sigur vrei să ștergi acest slot?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api'}/admin/slots/${slotId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        loadSlots();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Se încarcă...</div>
      </div>
    );
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    todayBookings: bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Înapoi la Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'users', 'bookings', 'slots'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'overview' ? 'Prezentare Generală' :
                 tab === 'users' ? 'Utilizatori' :
                 tab === 'bookings' ? 'Programări' : 'Sloturi'}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Total Utilizatori</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalUsers}</p>
                <p className="text-sm text-gray-500 mt-1">{stats.activeUsers} activi</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Total Programări</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalBookings}</p>
                <p className="text-sm text-gray-500 mt-1">{stats.confirmedBookings} confirmate</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Programări Azi</h3>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.todayBookings}</p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programări</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.documents_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.bookings_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilizator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ora</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{booking.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{booking.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{booking.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{booking.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'slots' && (
            <div>
              <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <label className="font-medium">Data:</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <button
                    onClick={handleAddSlots}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Adaugă Sloturi în Masă
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {slots.map((slot) => (
                  <div key={slot.id} className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-lg">{slot.time}</p>
                        <p className="text-sm text-gray-500">
                          {slot.current_bookings}/{slot.max_capacity} rezervări
                        </p>
                      </div>
                      {slot.current_bookings === 0 && (
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {slot.bookings && slot.bookings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {slot.bookings.filter(b => b.booking_id).map((booking) => (
                          <div key={booking.booking_id} className="text-xs bg-gray-100 p-2 rounded">
                            {booking.username} - {booking.email}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}