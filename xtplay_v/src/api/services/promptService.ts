import { fetchJson } from '@/utils/api'
import type { Prompt } from '@/types'

export const promptService = {
  async getAll(): Promise<Prompt[]> {
    return fetchJson<Prompt[]>('/prompts')
  },

  async getByKey(key: string): Promise<Prompt> {
    return fetchJson<Prompt>(`/prompts/${encodeURIComponent(key)}`)
  },

  async update(key: string, data: Partial<Prompt>): Promise<Prompt> {
    return fetchJson<Prompt>(`/prompts/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async replace(key: string, data: Prompt): Promise<Prompt> {
    return fetchJson<Prompt>(`/prompts/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async reload(): Promise<Prompt[]> {
    return fetchJson<Prompt[]>('/prompts/reload', {
      method: 'POST',
    })
  },
}
