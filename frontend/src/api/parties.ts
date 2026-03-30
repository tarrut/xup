import { api } from './client'
import type { Party } from '../types'

export const partiesApi = {
  create: () => api.post<{ id: string; code: string }>('/parties'),
  join: (code: string) => api.post<{ id: string; code: string }>('/parties/join', { code }),
  get: (code: string) => api.get<Party>(`/parties/${code}`),
  leave: (code: string) => api.delete(`/parties/${code}/leave`),
}
