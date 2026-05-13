import { fetchJson } from '@/utils/api'
import type { Lorebook, Entry } from '@/types'

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

  // Lorebook entry sub-resources
  async listEntries(lorebookId: number): Promise<Entry[]> {
    return fetchJson<Entry[]>(`/lorebooks/${lorebookId}/entries`)
  },

  async getEntry(lorebookId: number, entryId: number): Promise<Entry> {
    return fetchJson<Entry>(`/lorebooks/${lorebookId}/entries/${entryId}`)
  },

  async createEntry(lorebookId: number, data: Partial<Entry>): Promise<Entry> {
    return fetchJson<Entry>(`/lorebooks/${lorebookId}/entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateEntry(lorebookId: number, entryId: number, data: Partial<Entry>): Promise<Entry> {
    return fetchJson<Entry>(`/lorebooks/${lorebookId}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async replaceEntry(lorebookId: number, entryId: number, data: Partial<Entry>): Promise<Entry> {
    return fetchJson<Entry>(`/lorebooks/${lorebookId}/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteEntry(lorebookId: number, entryId: number): Promise<void> {
    return fetchJson<void>(`/lorebooks/${lorebookId}/entries/${entryId}`, {
      method: 'DELETE',
    })
  },
}
