import { fetchJson } from '@/utils/api'
import type { Session, StoryRound, OpeningDraft } from '@/types'

export const sessionService = {
  // Session CRUD
  async listByStory(storyId: number): Promise<Session[]> {
    return fetchJson<Session[]>(`/stories/${storyId}/sessions`)
  },

  async getById(sessionId: number): Promise<Session> {
    return fetchJson<Session>(`/sessions/${sessionId}`)
  },

  async create(storyId: number, data?: Partial<Session>): Promise<Session> {
    return fetchJson<Session>(`/stories/${storyId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    })
  },

  async update(sessionId: number, data: Partial<Session>): Promise<Session> {
    return fetchJson<Session>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(sessionId: number): Promise<void> {
    return fetchJson<void>(`/sessions/${sessionId}`, { method: 'DELETE' })
  },

  // Round CRUD
  async listRounds(sessionId: number): Promise<StoryRound[]> {
    return fetchJson<StoryRound[]>(`/sessions/${sessionId}/rounds`)
  },

  async getRound(sessionId: number, roundId: number): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/sessions/${sessionId}/rounds/${roundId}`)
  },

  async createRound(sessionId: number, data: Partial<StoryRound>): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/sessions/${sessionId}/rounds`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateRound(sessionId: number, roundId: number, data: Partial<StoryRound>): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/sessions/${sessionId}/rounds/${roundId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async replaceRound(sessionId: number, roundId: number, data: Partial<StoryRound>): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/sessions/${sessionId}/rounds/${roundId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteRound(sessionId: number, roundId: number): Promise<void> {
    return fetchJson<void>(`/sessions/${sessionId}/rounds/${roundId}`, {
      method: 'DELETE',
    })
  },

  // Generation
  async generateOpening(sessionId: number): Promise<OpeningDraft> {
    return fetchJson<OpeningDraft>(`/sessions/${sessionId}/generate-opening`, {
      method: 'POST',
    })
  },

  async generateRound(sessionId: number): Promise<StoryRound> {
    return fetchJson<StoryRound>(`/sessions/${sessionId}/generate-round`, {
      method: 'POST',
    })
  },
}
