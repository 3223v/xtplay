import { fetchJson } from '@/utils/api'
import type { Role } from '@/types'

export const roleService = {
  async getAll(): Promise<Role[]> {
    return fetchJson<Role[]>('/roles')
  },

  async getById(id: number): Promise<Role> {
    return fetchJson<Role>(`/roles/${id}`)
  },

  async create(data: Partial<Role>): Promise<Role> {
    return fetchJson<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: number, data: Partial<Role>): Promise<Role> {
    return fetchJson<Role>(`/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<void> {
    return fetchJson<void>(`/roles/${id}`, { method: 'DELETE' })
  },
}
