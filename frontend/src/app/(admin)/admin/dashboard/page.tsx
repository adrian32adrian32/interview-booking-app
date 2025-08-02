'use client';
import DashboardStats from '@/components/DashboardStats';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardPage() {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
          {t('dashboard.title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">
          {t('dashboard.subtitle')}
        </p>
      </div>
      
      <DashboardStats />
    </div>
  );
}