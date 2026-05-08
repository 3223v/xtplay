import { fetchJson } from '@/utils/api'
import type { Lorebook } from '@/types'

export const lorebookService = {
  async getAll(): Promise<Lorebook[]> {
    return fetchJson<Lorebook[]>('/lorebooks')
  },

  async getById(id: number): Promise<Lorebook> {
    return fetchJson<Lorebook>(`/lorebooks/${id}`)
  },

  async create(data: Partial<Lorebook>): Promise<Lorebook> {
    return fetchJson<Lorebook>('/lorebooks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: number, data: Partial<Lorebook>): Promise<Lorebook> {
    return fetchJson<Lorebook>(`/lorebooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<void> {
    return fetchJson<void>(`/lorebooks/${id}`, { method: 'DELETE' })
  },
}
