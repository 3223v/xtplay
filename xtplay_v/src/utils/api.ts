export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'

export function stripSystemFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result = { ...obj }
  const systemFields = ['id', 'created_at', 'updated_at']
  for (const key of systemFields) {
    delete result[key as keyof T]
  }
  return result
}

export async function fetchJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  if (res.status === 204) return null as T
  return res.json()
}
