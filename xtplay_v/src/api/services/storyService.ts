import { fetchJson } from '@/utils/api'
import type { Story } from '@/types'

export const storyService = {
  async getAll(): Promise<Story[]> {
    return fetchJson<Story[]>('/stories')
  },

  async getById(id: number): Promise<Story> {
    return fetchJson<Story>(`/stories/${id}`)
  },

  async create(data: Partial<Story>): Promise<Story> {
    return fetchJson<Story>('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: number, data: Partial<Story>): Promise<Story> {
    return fetchJson<Story>(`/stories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<void> {
    return fetchJson<void>(`/stories/${id}`, { method: 'DELETE' })
  },
}