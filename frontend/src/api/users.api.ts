import { http } from './http';
import type { CreateUserInput, UpdateUserInput, UserRecord } from '@/types/user';

export const usersApi = {
  list: () => http.get<UserRecord[]>('/users').then((r) => r.data),
  create: (input: CreateUserInput) => http.post<UserRecord>('/users', input).then((r) => r.data),
  update: (id: string, input: UpdateUserInput) => http.put<UserRecord>(`/users/${id}`, input).then((r) => r.data),
  /** Leave `password` unset to auto-generate a random one instead. */
  resetPassword: (id: string, password?: string) =>
    http.post<{ password: string }>(`/users/${id}/reset-password`, { password }).then((r) => r.data),
};
