import { create } from 'zustand';
import { AxiosError } from 'axios';
import { authApi } from '@/api/auth.api';
import { TOKEN_KEY } from '@/api/http';
import { getApiErrorMessage } from '@/api/http';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  loginWithPassword: (email: string, password: string) => Promise<string>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<string>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isLoading: false,
  error: null,

  loginWithPassword: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, session.accessToken);
      set({ user: session.user, isAuthenticated: true, isLoading: false });
      return session.redirectTo;
    } catch (err) {
      set({ isLoading: false, error: getApiErrorMessage(err, 'Invalid email or password') });
      throw err;
    }
  },

  sendOtp: async (phone) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.sendOtp(phone);
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: getApiErrorMessage(err, 'Could not send OTP') });
      throw err;
    }
  },

  verifyOtp: async (phone, code) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authApi.verifyOtp(phone, code);
      localStorage.setItem(TOKEN_KEY, session.accessToken);
      set({ user: session.user, isAuthenticated: true, isLoading: false });
      return session.redirectTo;
    } catch (err) {
      set({ isLoading: false, error: getApiErrorMessage(err, 'Invalid or expired OTP') });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchMe: async () => {
    try {
      const { user } = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch (err) {
      // Only a genuine 401 (revoked/expired token) should sign the user out —
      // a 429 (rate limit), a dropped connection, etc. should leave the
      // existing session alone so a page refresh doesn't bounce to /login.
      if (err instanceof AxiosError && err.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        set({ user: null, isAuthenticated: false });
      }
    }
  },

  clearError: () => set({ error: null }),
}));
