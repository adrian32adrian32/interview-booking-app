'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex gap-1">
      <div className="h-7 w-7 bg-gray-600 rounded animate-pulse" />
      <div className="h-7 w-7 bg-gray-600 rounded animate-pulse" />
      <div className="h-7 w-7 bg-gray-600 rounded animate-pulse" />
    </div>;
  }

  return (
    <div className="flex items-center gap-1">
      {/* Light Mode Button */}
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded transition-all ${
          theme === 'light' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
        }`}
        aria-label="Light mode"
        title="Light mode"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
      
      {/* Dark Mode Button */}
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded transition-all ${
          theme === 'dark' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
        }`}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>
      
      {/* Futuristic Mode Button */}
      <button
        onClick={() => setTheme('futuristic')}
        className={`p-1.5 rounded transition-all ${
          theme === 'futuristic' 
            ? 'bg-purple-500 text-white' 
            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
        }`}
        aria-label="Futuristic mode"
        title="Futuristic mode"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    </div>
  );
}