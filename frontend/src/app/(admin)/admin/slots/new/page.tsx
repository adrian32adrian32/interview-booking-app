'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NewSlotPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Add slot creation logic here
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t('slots.new.title')}</h1>
      <p className="text-gray-600 mb-6">{t('slots.new.description')}</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Add form fields here */}
        <button 
          type="submit" 
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('common.save')}
        </button>
      </form>
    </div>
  );
}