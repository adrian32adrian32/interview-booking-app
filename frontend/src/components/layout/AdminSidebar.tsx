'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, CalendarDays,
  BarChart3, Settings, LogOut, ChevronLeft,
  BookOpen, FileText, Bell
} from 'lucide-react';

export default function AdminSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard
    },
    {
      title: 'Calendar',
      href: '/admin/calendar',
      icon: CalendarDays
    },
    {
      title: 'Programări',
      href: '/admin/bookings',
      icon: Calendar
    },
    {
      title: 'Utilizatori',
      href: '/admin/users',
      icon: Users
    },
    {
      title: 'Statistici',
      href: '/admin/statistics',
      icon: BarChart3
    },
    {
      title: 'Setări',
      href: '/admin/settings',
      icon: Settings
    }
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className={`bg-gray-900 text-white h-screen sticky top-0 transition-all ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="p-4">
        <h1 className={`text-xl font-bold ${collapsed ? 'hidden' : 'block'}`}>
          Admin Panel
        </h1>
      </div>

      <nav className="mt-8">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800'
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

      <div className="absolute bottom-0 w-full p-4">
        <button className="flex items-center text-gray-400 hover:text-white w-full">
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Deconectare</span>}
        </button>
      </div>
    </aside>
  );
}
