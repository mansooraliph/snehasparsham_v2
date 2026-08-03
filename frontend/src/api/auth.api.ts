import { http } from './http';
import type { SessionResponse } from '@/types/auth';

export const authApi = {
  login: (email: string, password: string) =>
    http.post<SessionResponse>('/auth/login', { email, password }).then((r) => r.data),

  sendOtp: (phone: string) => http.post<{ success: true; message: string }>('/auth/otp/send', { phone }).then((r) => r.data),

  verifyOtp: (phone: string, code: string) =>
    http.post<SessionResponse>('/auth/otp/verify', { phone, code }).then((r) => r.data),

  forgotPassword: (email: string) =>
    http.post<{ success: true; message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    http.post<{ success: true; message: string }>('/auth/reset-password', { token, newPassword }).then((r) => r.data),

  refresh: () => http.post<SessionResponse>('/auth/refresh').then((r) => r.data),

  logout: () => http.post<{ success: true }>('/auth/logout').then((r) => r.data),

  me: () => http.get<{ user: SessionResponse['user']; redirectTo: string }>('/auth/me').then((r) => r.data),
};
