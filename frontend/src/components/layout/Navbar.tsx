'use client';
import LanguageSwitcher from '@/components/LanguageSwitcher';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calendar, Home, Users, Settings, LogOut, FileText, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Navbar() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (path: string) => pathname === path;

  const publicLinks = [
    { href: '/', label: t('navigation.home'), icon: Home },
    { href: '/booking', label: t('navigation.scheduleInterview'), icon: Calendar },
  ];

  const adminLinks = [
    { href: '/admin/dashboard', label: t('navigation.dashboard'), icon: Home },
    { href: '/admin/bookings', label: t('navigation.bookings'), icon: Calendar },
    { href: '/admin/users', label: t('navigation.users'), icon: Users },
    { href: '/admin/time-slots', label: t('navigation.timeSlots'), icon: Clock },
    { href: '/admin/reports', label: t('navigation.reports'), icon: FileText },
    { href: '/admin/settings', label: t('navigation.settings'), icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href={user ? '/admin/dashboard' : '/'} className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="font-bold text-xl text-gray-800 dark:text-gray-100">{t('layout.interviewBooking')}</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {!user ? (
                // Public Links
                publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive(link.href)
                        ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <link.icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Link>
                ))
              ) : (
                // Admin Links
                adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive(link.href)
                        ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <link.icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {/* Theme Toggle & Language Switcher */}
            <LanguageSwitcher />
            <ThemeToggle />
            
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('navigation.welcome')}, <strong>{user.name}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('navigation.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('navigation.login')}
                </Link>
                <Link
                  href="/booking"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('navigation.scheduleInterview')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex items-center sm:hidden space-x-2">
            {/* Theme Toggle & Language Switcher Mobile */}
            <LanguageSwitcher />
            <ThemeToggle />
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">{t('navigation.openMainMenu')}</span>
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {!user ? (
            // Public Mobile Links
            publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive(link.href)
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center">
                  <link.icon className="w-4 h-4 mr-3" />
                  {link.label}
                </div>
              </Link>
            ))
          ) : (
            // Admin Mobile Links
            adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive(link.href)
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center">
                  <link.icon className="w-4 h-4 mr-3" />
                  {link.label}
                </div>
              </Link>
            ))
          )}
        </div>
        
        {/* Mobile user section */}
        <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
          {user ? (
            <div className="space-y-1">
              <div className="px-4 py-2">
                <div className="text-base font-medium text-gray-800 dark:text-gray-200">{user.name}</div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="flex items-center">
                  <LogOut className="w-4 h-4 mr-3" />
                  {t('navigation.logout')}
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Link
                href="/login"
                className="block px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setIsOpen(false)}
              >
                {t('navigation.loginAdmin')}
              </Link>
              <Link
                href="/booking"
                className="block px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('navigation.scheduleInterview')}
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
