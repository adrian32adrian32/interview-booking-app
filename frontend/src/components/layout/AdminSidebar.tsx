'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, CalendarDays,
  BarChart3, Settings, LogOut, ChevronLeft,
  BookOpen, FileText, Bell, Mail, Clock
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { toastService } from '@/services/toastService';

interface AdminSidebarProps {
  collapsed?: boolean;
}

export default function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    {
      title: t('admin.menu.dashboard'),
      href: '/admin/dashboard',
      icon: LayoutDashboard
    },
    {
      title: t('admin.menu.calendar'),
      href: '/admin/calendar',
      icon: CalendarDays
    },
    {
      title: t('admin.menu.bookings'),
      href: '/admin/bookings',
      icon: Calendar
    },
    {
      title: t('admin.menu.users'),
      href: '/admin/users',
      icon: Users
    },
    {
      title: t('admin.menu.timeSettings'),
      href: '/admin/time-settings',
      icon: Clock
    },
    {
      title: t('admin.menu.statistics'),
      href: '/admin/statistics',
      icon: BarChart3
    },
    {
      title: t('admin.menu.settings'),
      href: '/admin/settings',
      icon: Settings
    },
    {
      title: t('admin.menu.emailTemplates'),
      href: '/admin/email-templates',
      icon: Mail
    }
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    toastService.success('success.generic', t('auth.logout_success'));
    router.push('/login');
  };

  return (
    <aside className={`bg-gray-900 dark:bg-gray-950 futuristic:bg-[#0a0a1f] text-white h-screen sticky top-0 transition-all border-r border-gray-800 dark:border-gray-900 futuristic:border-purple-500/20 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header cu Theme Toggle */}
      <div className="p-4 border-b border-gray-800 dark:border-gray-700 futuristic:border-purple-500/30">
        <div className="flex items-center justify-between">
          <h1 className={`text-xl font-bold ${collapsed ? 'hidden' : 'block'}`}>
            {t('admin.panel')}
          </h1>
          <div className="flex flex-col gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <nav className="mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white'
                  : 'hover:bg-gray-800 dark:hover:bg-gray-800/50 futuristic:hover:bg-purple-900/30 text-gray-300 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="ml-3">{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-gray-800 dark:border-gray-700 futuristic:border-purple-500/30">
        <button 
          onClick={handleLogout}
          className="flex items-center text-gray-400 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">{t('auth.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}