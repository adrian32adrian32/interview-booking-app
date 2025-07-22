'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SlotsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/admin/dashboard');
  }, []);
  
  return (
    <div className="flex items-center justify-center h-64">
      <p>Sloturile sunt generate automat...</p>
    </div>
  );
}
