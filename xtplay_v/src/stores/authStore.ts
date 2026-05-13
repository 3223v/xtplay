import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserPublic } from '@/types'
import { authService } from '@/api'

const STORAGE_KEY = 'xtplay_user'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserPublic | null>(loadUser())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const userId = computed(() => user.value?.id ?? null)
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin')
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const userRole = computed(() => user.value?.role ?? '')

  function loadUser(): UserPublic | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function saveUser(u: UserPublic) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  }

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const res = await authService.login(username, password)
      user.value = res.user
      saveUser(res.user)
      return res.user
    } catch (e) {
      error.value = e instanceof Error ? e.message : '登录失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, password: string, email = '') {
    loading.value = true
    error.value = null
    try {
      const res = await authService.register(username, password, email)
      user.value = res.user
      saveUser(res.user)
      return res.user
    } catch (e) {
      error.value = e instanceof Error ? e.message : '注册失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearAuth() {
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function setUser(u: UserPublic) {
    user.value = u
    saveUser(u)
  }

  function logout() {
    clearAuth()
  }

  return {
    user,
    loading,
    error,
    userId,
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    userRole,
    login,
    register,
    logout,
    clearAuth,
    setUser,
  }
})
