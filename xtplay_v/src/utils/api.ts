import { useAuthStore } from '@/stores/authStore'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'

export function stripSystemFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result = { ...obj }
  const systemFields = ['id', 'created_at', 'updated_at']
  for (const key of systemFields) {
    delete result[key as keyof T]
  }
  return result
}

function getAuthHeaders(): Record<string, string> {
  const authStore = useAuthStore()
  const headers: Record<string, string> = {}
  if (authStore.userId) {
    headers['X-User-Id'] = String(authStore.userId)
  }
  return headers
}

export async function fetchJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  }
  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 401) {
      const authStore = useAuthStore()
      authStore.clearAuth()
    }
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  if (res.status === 204) return null as T
  return res.json()
}
