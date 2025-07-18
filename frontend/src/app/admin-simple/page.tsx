export default function AdminSimplePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard - Simple Version</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Total Users</h2>
            <p className="text-3xl font-bold text-blue-600">5</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Total Bookings</h2>
            <p className="text-3xl font-bold text-green-600">12</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Active Slots</h2>
            <p className="text-3xl font-bold text-purple-600">8</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/admin/users" className="block p-3 bg-blue-50 rounded hover:bg-blue-100">
              → Manage Users
            </a>
            <a href="/admin/bookings" className="block p-3 bg-green-50 rounded hover:bg-green-100">
              → View Bookings
            </a>
            <a href="/logout" className="block p-3 bg-red-50 rounded hover:bg-red-100">
              → Logout
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
