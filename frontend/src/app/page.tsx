'use client';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">
          Sistem Programări Interviuri
        </h1>
        <p className="mb-8 text-gray-600">Bine ai venit! Alege o opțiune:</p>
        <div className="space-x-4">
          <button 
            onClick={() => window.location.href='/login'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Login
          </button>
          <button 
            onClick={() => window.location.href='/register'}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition duration-200"
          >
            Înregistrare
          </button>
        </div>
      </div>
    </main>
  );
}