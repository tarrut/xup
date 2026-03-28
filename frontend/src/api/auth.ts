import { api } from './client'
import type { User } from '../types'

export const authApi = {
  register: (username: string, password: string) =>
    api.postForm<User>('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    api.postForm<User>('/auth/login', { username, password }),
  guest: (username: string) =>
    api.post<User>('/auth/guest', { username }),
  logout: () => api.post<{ ok: boolean }>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
}
