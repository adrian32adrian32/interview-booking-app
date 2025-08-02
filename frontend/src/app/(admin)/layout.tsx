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
  CalendarDays,
  Clock,
  BarChart,
  Settings,
  Mail,
  LogOut,
  Shield
} from 'lucide-react';
import AdminRoute from '@/components/AdminRoute';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import NotificationSystem from '@/components/notifications/NotificationSystem';

const navigation = [
  { name: 'admin.menu.dashboard', href: '/admin/dashboard', icon: Home },
  { name: 'admin.menu.calendar', href: '/admin/calendar', icon: CalendarDays },
  { name: 'admin.menu.bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'admin.menu.users', href: '/admin/users', icon: Users },
  { name: 'admin.menu.timeSettings', href: '/admin/time-settings', icon: Clock },
  { name: 'admin.menu.statistics', href: '/admin/stats', icon: BarChart },
  { name: 'admin.menu.settings', href: '/admin/settings', icon: Settings },
  { name: 'admin.menu.emailTemplates', href: '/admin/email-templates', icon: Mail },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
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
                  <span className="ml-2 text-white dark:text-gray-100 futuristic:text-foreground text-xl font-semibold">{t("admin.panel")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <NotificationSystem />
                  <ThemeToggle />
                </div>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={t(item.name)}
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
                            ? 'text-gray-300'
                            : 'text-gray-400 group-hover:text-gray-300'
                          }
                        `}
                      />
                      {t(item.name)}
                    </Link>
                  );
                })}
              </nav>
            
              {/* Language Switcher */}
              <div className="px-4 py-3 border-t border-gray-700 dark:border-gray-800">
                <LanguageSwitcher compact />
              </div>
              </div>
            <div className="flex-shrink-0 flex bg-gray-700 dark:bg-gray-900 futuristic:bg-card/50 p-4">
              <button
                onClick={handleLogout}
                className="flex items-center w-full text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-600 dark:hover:bg-gray-800 futuristic:hover:bg-accent px-2 py-2 rounded-md transition-colors"
              >
                <LogOut className="mr-3 h-6 w-6" />
                Delogare
              </button>
            </div>
          </div>
        </div>

        {/* Header pentru mobile */}
        <div className="md:hidden">
          <div className="bg-gray-800 dark:bg-gray-950 futuristic:bg-card border-b border-gray-700 dark:border-gray-900 futuristic:border-border px-4 py-2 flex items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                className="text-gray-400 hover:text-white focus:outline-none focus:text-white"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <div className="ml-4 flex items-center">
                <Shield className="h-8 w-8 text-white" />
                <span className="ml-2 text-white text-xl font-semibold">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationSystem />
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-gray-800 dark:bg-gray-900 futuristic:bg-black bg-opacity-75" onClick={() => setSidebarOpen(false)}>
            <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 dark:bg-gray-950 futuristic:bg-card" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700 dark:border-gray-900 futuristic:border-border">
                  <div className="flex items-center">
                    <Shield className="h-8 w-8 text-white" />
                    <span className="ml-2 text-white text-xl font-semibold">{t("admin.panel")}</span>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-white"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={t(item.name)}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          group flex items-center px-2 py-2 text-sm font-medium rounded-md
                          ${isActive
                            ? 'bg-gray-900 dark:bg-blue-900/50 futuristic:bg-primary text-white'
                            : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800 futuristic:hover:bg-accent hover:text-white'
                          }
                        `}
                      >
                        <item.icon
                          className={`
                            mr-3 flex-shrink-0 h-6 w-6
                            ${isActive
                              ? 'text-gray-300'
                              : 'text-gray-400 group-hover:text-gray-300'
                            }
                          `}
                        />
                        {t(item.name)}
                      </Link>
                    );
                  })}
                </nav>
                <div className="flex-shrink-0 p-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 dark:hover:bg-gray-800 futuristic:hover:bg-accent px-2 py-2 rounded-md"
                  >
                    <LogOut className="mr-3 h-6 w-6" />
                    Delogare
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="md:pl-64 flex flex-col flex-1">
          <main className="flex-1">
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