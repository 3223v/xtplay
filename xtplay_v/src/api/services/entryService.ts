import { fetchJson } from '@/utils/api'
import type { Entry } from '@/types'

export const entryService = {
  async getAll(): Promise<Entry[]> {
    return fetchJson<Entry[]>('/entries')
  },

  async getById(id: number): Promise<Entry> {
    return fetchJson<Entry>(`/entries/${id}`)
  },

  async create(data: Partial<Entry>): Promise<Entry> {
    return fetchJson<Entry>('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: number, data: Partial<Entry>): Promise<Entry> {
    return fetchJson<Entry>(`/entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<void> {
    return fetchJson<void>(`/entries/${id}`, { method: 'DELETE' })
  },
}
