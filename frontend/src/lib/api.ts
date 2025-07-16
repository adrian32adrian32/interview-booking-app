const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
  },
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
