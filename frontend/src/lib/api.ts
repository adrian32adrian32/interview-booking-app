const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://94.156.250.138/api';

export const getAuthHeader = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Auth endpoints
  auth: {
    login: async (data: { emailOrUsername: string; password: string }) => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    register: async (data: { email: string; username: string; password: string }) => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    getMe: async () => {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: getAuthHeader(),
      });
      return response.json();
    },

    logout: () => {
      // Șterge din localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Șterge cookie-ul
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
      
      // Redirect la login
      window.location.href = '/login';
    },
  },

  // User endpoints
  user: {
    updateProfile: async (data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
    }) => {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        } as HeadersInit,
        body: JSON.stringify(data),
      });
      return response.json();
    },

    uploadDocument: async (file: File, type: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch(`${API_URL}/users/upload`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });
      return response.json();
    },

    getDocuments: async () => {
      const response = await fetch(`${API_URL}/users/documents`, {
        headers: getAuthHeader(),
      });
      return response.json();
    },

    deleteDocument: async (documentId: string) => {
      const response = await fetch(`${API_URL}/users/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      return response.json();
    },
  },

  // Booking endpoints
  bookings: {
    getAvailableSlots: async (date: string) => {
      const response = await fetch(`${API_URL}/bookings/slots?date=${date}`, {
        headers: getAuthHeader(),
      });
      return response.json();
    },

    createBooking: async (data: { date: string; time: string; type: string }) => {
      const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        } as HeadersInit,
        body: JSON.stringify(data),
      });
      return response.json();
    },

    getMyBookings: async () => {
      const response = await fetch(`${API_URL}/bookings/my`, {
        headers: getAuthHeader(),
      });
      return response.json();
    },

    cancelBooking: async (bookingId: string) => {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });
      return response.json();
    },
  },
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};