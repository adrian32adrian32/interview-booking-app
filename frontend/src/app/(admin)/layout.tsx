'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Calendar,
  // Clock, // Removed - nu mai avem nevoie de sloturi
  BarChart,
  Settings,
  LogOut,
  Shield
} from 'lucide-react';
import AdminRoute from '@/components/AdminRoute';
import { ThemeToggle } from '@/components/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { name: 'Utilizatori', href: '/admin/users', icon: Users },
  { name: 'Programări', href: '/admin/bookings', icon: Calendar },
  // { name: 'Sloturi de timp', href: '/admin/slots', icon: Clock }, // COMENTAT - Sloturile sunt generate automat
  { name: 'Statistici', href: '/admin/stats', icon: BarChart },
  { name: 'Setări', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    
    // Redirect to login
    router.push('/login');
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 futuristic:bg-background transition-colors duration-300">
        {/* Sidebar pentru desktop */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex-1 flex flex-col min-h-0 bg-gray-800 dark:bg-gray-950 futuristic:bg-card border-r border-gray-700 dark:border-gray-900 futuristic:border-border">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between flex-shrink-0 px-4">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-white dark:text-gray-100 futuristic:text-primary" />
                  <span className="ml-2 text-white dark:text-gray-100 futuristic:text-foreground text-xl font-semibold">Admin Panel</span>
                </div>
                <ThemeToggle />
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                        ${isActive
                          ? 'bg-gray-900 dark:bg-blue-900/50 futuristic:bg-primary text-white futuristic:text-primary-foreground'
                          : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800 futuristic:hover:bg-accent hover:text-white futuristic:hover:text-accent-foreground'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          mr-3 flex-shrink-0 h-6 w-6
                          ${isActive 
                            ? 'text-white dark:text-blue-300 futuristic:text-primary-foreground' 
                            : 'text-gray-400 dark:text-gray-500 futuristic:text-muted-foreground group-hover:text-gray-300 dark:group-hover:text-gray-400 futuristic:group-hover:text-accent-foreground'
                          }
                        `}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex bg-gray-700 dark:bg-gray-900 futuristic:bg-secondary p-4 border-t border-gray-600 dark:border-gray-800 futuristic:border-border">
              <button
                onClick={handleLogout}
                className="flex-shrink-0 w-full group block hover:bg-gray-600 dark:hover:bg-gray-800 futuristic:hover:bg-accent rounded-md p-2 transition-colors"
              >
                <div className="flex items-center">
                  <LogOut className="inline-block h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-muted-foreground group-hover:text-gray-300 dark:group-hover:text-gray-400 futuristic:group-hover:text-accent-foreground" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white dark:text-gray-100 futuristic:text-foreground">Deconectare</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 futuristic:bg-card shadow dark:shadow-gray-900 futuristic:shadow-border z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400 futuristic:text-primary" />
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-gray-100 futuristic:text-foreground">Admin Panel</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 dark:text-gray-400 futuristic:text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300 futuristic:hover:text-foreground"
              >
                {sidebarOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-gray-800 dark:bg-gray-900 futuristic:bg-black bg-opacity-75" onClick={() => setSidebarOpen(false)}>
            <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 dark:bg-gray-950 futuristic:bg-card" onClick={(e) => e.stopPropagation()}>
              <div className="pt-16 pb-4">
                <nav className="px-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                          ${isActive
                            ? 'bg-gray-900 dark:bg-blue-900/50 futuristic:bg-primary text-white futuristic:text-primary-foreground'
                            : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800 futuristic:hover:bg-accent hover:text-white futuristic:hover:text-accent-foreground'
                          }
                        `}
                      >
                        <item.icon
                          className={`
                            mr-3 flex-shrink-0 h-6 w-6
                            ${isActive 
                              ? 'text-white dark:text-blue-300 futuristic:text-primary-foreground' 
                              : 'text-gray-400 dark:text-gray-500 futuristic:text-muted-foreground group-hover:text-gray-300'
                            }
                          `}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
                <div className="mt-6 px-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 dark:hover:bg-gray-800 futuristic:hover:bg-accent hover:text-white futuristic:hover:text-accent-foreground transition-colors"
                  >
                    <LogOut className="mr-3 h-6 w-6 text-gray-400 dark:text-gray-500 futuristic:text-muted-foreground" />
                    Deconectare
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="md:pl-64 flex flex-col flex-1">
          <main className="flex-1 md:pt-0 pt-16">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AdminRoute>
  );
}