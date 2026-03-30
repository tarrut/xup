import { api } from './client'
import type { User } from '../types'

export const usersApi = {
  updateDisplayName: (display_name: string) => api.patch<User>('/users/me', { display_name }),
}
