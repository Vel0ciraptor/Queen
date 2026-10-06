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

const initialToken = readToken();

function readUser(): User | null {
  const raw = localStorage.getItem('queen_user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.id) {
      localStorage.removeItem('queen_user');
      return null;
    }
    return parsed as User;
  } catch {
    localStorage.removeItem('queen_user');
    return null;
  }
}

function readToken(): string | null {
  const raw = localStorage.getItem('queen_access_token');
  if (!raw || raw === 'undefined' || raw === 'null') {
    if (raw) localStorage.removeItem('queen_access_token');
    return null;
  }
  return raw;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readUser(),
  token: initialToken,
  isAuthenticated: !!initialToken,

  login: (user: User, token: string) => {
    if (!user?.id || !token || token === 'undefined') return;
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
