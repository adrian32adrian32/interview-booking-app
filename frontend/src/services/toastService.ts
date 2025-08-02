import toast from 'react-hot-toast';
import translations from '@/translations';
import { Language } from '@/translations';

class ToastService {
  private getLanguage(): Language {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as Language;
      return savedLang || 'ro';
    }
    return 'ro';
  }

  private t(key: string, fallback?: string): string {
    const language = this.getLanguage();
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        // Dacă nu găsește traducerea, folosește fallback sau cheia
        return fallback || key;
      }
    }
    
    return typeof value === 'string' ? value : (fallback || key);
  }

  success(key: string, fallback?: string) {
    const message = this.t(key, fallback);
    toast.success(message);
  }

  error(key: string, fallback?: string) {
    const message = this.t(key, fallback);
    toast.error(message);
  }

  info(key: string, fallback?: string) {
    const message = this.t(key, fallback);
    toast(message);
  }

  warning(key: string, fallback?: string) {
    const message = this.t(key, fallback);
    toast(message, {
      icon: '⚠️',
    });
  }

  // Pentru erori de API
  apiError(error: any) {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          this.error('error.unauthorized');
          break;
        case 403:
          this.error('error.forbidden');
          break;
        case 404:
          this.error('error.notFound');
          break;
        case 500:
          this.error('error.server');
          break;
        default:
          const message = error.response.data?.message;
          if (message) {
            // Afișează mesajul de la server direct
            toast.error(message);
          } else {
            this.error('error.generic');
          }
      }
    } else if (error.request) {
      this.error('error.network');
    } else {
      this.error('error.generic');
    }
  }

  // Metodă pentru mesaje custom (fără traducere)
  custom(message: string, type: 'success' | 'error' | 'info' = 'info') {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      default:
        toast(message);
    }
  }
}

export const toastService = new ToastService();