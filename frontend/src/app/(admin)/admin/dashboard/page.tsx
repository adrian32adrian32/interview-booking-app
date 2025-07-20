'use client';

import DashboardStats from '@/components/DashboardStats';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="mt-2 text-gray-600">Monitorizează performanța și gestionează sistemul</p>
      </div>
      
      <DashboardStats />
    </div>
  );
}
