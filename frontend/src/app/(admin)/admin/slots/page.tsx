'use client';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';

export default function SlotsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  
  useEffect(() => {
    router.push('/admin/dashboard');
  }, []);
  
  return (
    <div className="flex items-center justify-center h-64">
      <p>{t('slots.sloturile_sunt_generate_automa')}</p>
    </div>
  );
}
