'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  User, 
  LogOut,
  FileText,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import dynamic from 'next/dynamic';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Programările mele', href: '/bookings', icon: Calendar },
  { name: 'Profil', href: '/profile', icon: User },
  { name: 'Documentele mele', href: '/documents', icon: FileText },
];

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration errors
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 futuristic:bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 futuristic:border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 futuristic:bg-background transition-colors duration-300">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 futuristic:bg-black bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800 futuristic:bg-card">
            <div className="flex h-16 items-center justify-between px-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-foreground">Interview Booking</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-500 dark:text-gray-400 futuristic:text-muted-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      ${isActive
                        ? 'bg-blue-100 dark:bg-blue-900/50 futuristic:bg-primary text-blue-900 dark:text-blue-300 futuristic:text-primary-foreground'
                        : 'text-gray-600 dark:text-gray-300 futuristic:text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-accent hover:text-gray-900 dark:hover:text-gray-100 futuristic:hover:text-accent-foreground'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        mr-3 h-5 w-5 flex-shrink-0
                        ${isActive 
                          ? 'text-blue-600 dark:text-blue-400 futuristic:text-primary-foreground' 
                          : 'text-gray-400 dark:text-gray-500 futuristic:text-muted-foreground group-hover:text-gray-500 dark:group-hover:text-gray-400 futuristic:group-hover:text-accent-foreground'
                        }
                      `}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 futuristic:border-border">
              <button
                onClick={logout}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 futuristic:text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-accent hover:text-gray-900 dark:hover:text-gray-100 futuristic:hover:text-accent-foreground w-full"
              >
                <LogOut className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-muted-foreground group-hover:text-gray-500 dark:group-hover:text-gray-400 futuristic:group-hover:text-accent-foreground" />
                Deconectare
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col bg-white dark:bg-gray-800 futuristic:bg-card border-r border-gray-200 dark:border-gray-700 futuristic:border-border">
          <div className="flex h-16 items-center justify-between px-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-foreground">Interview Booking</h2>
            <ThemeToggle />
          </div>
          
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive
                      ? 'bg-blue-100 dark:bg-blue-900/50 futuristic:bg-primary text-blue-900 dark:text-blue-300 futuristic:text-primary-foreground'
                      : 'text-gray-600 dark:text-gray-300 futuristic:text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-accent hover:text-gray-900 dark:hover:text-gray-100 futuristic:hover:text-accent-foreground'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive 
                        ? 'text-blue-600 dark:text-blue-400 futuristic:text-primary-foreground' 
                        : 'text-gray-400 dark:text-gray-500 futuristic:text-muted-foreground group-hover:text-gray-500 dark:group-hover:text-gray-400 futuristic:group-hover:text-accent-foreground'
                      }
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 futuristic:border-border">
            {user && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-foreground">{user.name || user.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 futuristic:text-muted-foreground">{user.role === 'admin' ? 'Administrator' : 'Utilizator'}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 futuristic:text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 futuristic:hover:bg-accent hover:text-gray-900 dark:hover:text-gray-100 futuristic:hover:text-accent-foreground w-full"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 futuristic:text-muted-foreground group-hover:text-gray-500 dark:group-hover:text-gray-400 futuristic:group-hover:text-accent-foreground" />
              Deconectare
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 futuristic:bg-card shadow dark:shadow-gray-700 futuristic:shadow-border lg:hidden">
          <div className="flex h-16 items-center px-4">
            <button
              type="button"
              className="text-gray-500 dark:text-gray-400 futuristic:text-muted-foreground hover:text-gray-600 dark:hover:text-gray-300 futuristic:hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-foreground">Interview Booking</h1>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Export as dynamic component to avoid SSR issues
export default dynamic(() => Promise.resolve(DashboardLayoutContent), {
  ssr: false
});