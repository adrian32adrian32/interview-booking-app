import { ThemeToggle } from '@/components/ThemeToggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 futuristic:bg-background transition-colors duration-300">
      {/* Theme toggle în colțul din dreapta sus */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Content centrat */}
      <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo sau titlu */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-foreground">
              Interview Booking
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 futuristic:text-muted-foreground">
              Sistem de programare pentru interviuri
            </p>
          </div>
          
          {/* Conținutul paginii (login/register/etc) */}
          {children}
        </div>
      </div>
    </div>
  );
}