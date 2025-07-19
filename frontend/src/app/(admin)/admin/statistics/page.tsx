'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Calendar, 
  Download, Filter, RefreshCw, PieChart
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ro } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    fetchStatistics();
  }, [period]);

  const fetchStatistics = async () => {
    try {
      // Simulare date pentru demo
      setStats({
        bookings: {
          total: 156,
          completed: 89,
          cancelled: 12,
          pending: 55
        },
        users: {
          total: 234,
          active: 189,
          new: 23
        },
        conversion: {
          rate: 72,
          trend: '+5%'
        },
        popular: {
          times: ['10:00', '14:00', '11:00'],
          days: ['Marți', 'Joi', 'Luni']
        }
      });
      setLoading(false);
    } catch (error) {
      toast.error('Eroare la încărcarea statisticilor');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Statistici Detaliate</h1>
        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="week">Ultima săptămână</option>
            <option value="month">Ultima lună</option>
            <option value="quarter">Ultimul trimestru</option>
            <option value="year">Ultimul an</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4 inline mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {!loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-600">Total Programări</h3>
              <p className="text-3xl font-bold mt-2">{stats.bookings.total}</p>
              <p className="text-sm text-green-600 mt-1">+12% față de luna trecută</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-600">Rata de Finalizare</h3>
              <p className="text-3xl font-bold mt-2">{stats.conversion.rate}%</p>
              <p className="text-sm text-green-600 mt-1">{stats.conversion.trend}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-600">Utilizatori Activi</h3>
              <p className="text-3xl font-bold mt-2">{stats.users.active}</p>
              <p className="text-sm text-gray-600 mt-1">din {stats.users.total} total</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-600">Utilizatori Noi</h3>
              <p className="text-3xl font-bold mt-2">{stats.users.new}</p>
              <p className="text-sm text-gray-600 mt-1">în această perioadă</p>
            </div>
          </div>

          {/* Grafice */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Distribuție Status Programări</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Finalizate</span>
                    <span className="text-sm font-medium">{stats.bookings.completed}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full" style={{width: '57%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">În așteptare</span>
                    <span className="text-sm font-medium">{stats.bookings.pending}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-yellow-500 h-3 rounded-full" style={{width: '35%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Anulate</span>
                    <span className="text-sm font-medium">{stats.bookings.cancelled}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-red-500 h-3 rounded-full" style={{width: '8%'}}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Ore Populare</h2>
              <div className="space-y-3">
                {stats.popular.times.map((time: string, index: number) => (
                  <div key={time} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">#{index + 1}</span>
                    <span>{time}</span>
                    <span className="text-sm text-gray-600">{25 - index * 5} programări</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
