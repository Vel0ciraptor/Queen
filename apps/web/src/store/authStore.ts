import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PROMOTORA';
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const savedUser = localStorage.getItem('queen_user');
const savedToken = localStorage.getItem('queen_access_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken || null,
  isAuthenticated: !!savedToken,

  login: (user: User, token: string) => {
    localStorage.setItem('queen_user', JSON.stringify(user));
    localStorage.setItem('queen_access_token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('queen_user');
    localStorage.removeItem('queen_access_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
