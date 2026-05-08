import { fetchJson } from '@/utils/api'
import type { Preset } from '@/types'

export const presetService = {
  async getAll(): Promise<Preset[]> {
    return fetchJson<Preset[]>('/presets')
  },

  async getById(id: number): Promise<Preset> {
    return fetchJson<Preset>(`/presets/${id}`)
  },

  async create(data: Partial<Preset>): Promise<Preset> {
    return fetchJson<Preset>('/presets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: number, data: Partial<Preset>): Promise<Preset> {
    return fetchJson<Preset>(`/presets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<void> {
    return fetchJson<void>(`/presets/${id}`, { method: 'DELETE' })
  },
}
