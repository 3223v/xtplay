import { fetchJson } from '@/utils/api'
import type { Story, StoryRound, OpeningDraft } from '@/types'

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

  async generateOpening(storyId: number): Promise<OpeningDraft> {
    return fetchJson<OpeningDraft>(`/stories/${storyId}/generate-opening`, {
      method: 'POST',
    })
  },

  async generateRound(storyId: number): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/stories/${storyId}/generate-round`, {
      method: 'POST',
    })
  },

  // Round CRUD
  async listRounds(storyId: number): Promise<StoryRound[]> {
    return fetchJson<StoryRound[]>(`/stories/${storyId}/rounds`)
  },

  async getRound(storyId: number, roundId: number): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/stories/${storyId}/rounds/${roundId}`)
  },

  async createRound(storyId: number, data: Partial<StoryRound>): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/stories/${storyId}/rounds`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateRound(storyId: number, roundId: number, data: Partial<StoryRound>): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/stories/${storyId}/rounds/${roundId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async replaceRound(storyId: number, roundId: number, data: Partial<StoryRound>): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/stories/${storyId}/rounds/${roundId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteRound(storyId: number, roundId: number): Promise<void> {
    return fetchJson<void>(`/stories/${storyId}/rounds/${roundId}`, {
      method: 'DELETE',
    })
  },
}
