import { fetchJson } from '@/utils/api'
import type { UserPublic, AuthResponse, UserUpdate, UserRoleUpdate } from '@/types'

export const authService = {
  async register(username: string, password: string, email = ''): Promise<AuthResponse> {
    return fetchJson<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    })
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    return fetchJson<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  async listUsers(): Promise<UserPublic[]> {
    return fetchJson<UserPublic[]>('/auth/users')
  },

  async getUser(userId: number): Promise<UserPublic> {
    return fetchJson<UserPublic>(`/auth/users/${userId}`)
  },

  async updateUser(userId: number, data: UserUpdate): Promise<UserPublic> {
    return fetchJson<UserPublic>(`/auth/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async updateMe(data: UserUpdate): Promise<UserPublic> {
    return fetchJson<UserPublic>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async updateUserRole(userId: number, data: UserRoleUpdate): Promise<UserPublic> {
    return fetchJson<UserPublic>(`/auth/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}
