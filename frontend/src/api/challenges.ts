import { api } from './client'

export const challengesApi = {
  create: (party_code: string, target_id: string, shots: number) =>
    api.post<{ challenge_id: string }>('/challenge/', { party_code, target_id, shots }),
  respond: (id: string, accept: boolean) =>
    api.post<{ status: string; winner_id?: string }>(`/challenge/${id}/respond`, { accept }),
  wsTicket: () => api.get<{ ticket: string }>('/challenge/ws-ticket'),
}
