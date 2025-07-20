'use client';

import UsersList from '@/components/UsersList';

export default function UsersPage() {
  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Utilizatori</h1>
        <p className="mt-2 text-gray-600">Gestionează utilizatorii platformei</p>
      </div>
      
      <UsersList />
    </div>
  );
}
