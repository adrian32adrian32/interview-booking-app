'use client';

import DashboardStats from '@/components/DashboardStats';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          Dashboard Admin
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">
          Monitorizează performanța și gestionează sistemul
        </p>
      </div>
      
      <DashboardStats />
    </div>
  );
}