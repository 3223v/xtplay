import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Prompt } from '@/types'
import { promptService } from '@/api'

export const usePromptStore = defineStore('prompt', () => {
  const items = ref<Prompt[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await promptService.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function update(key: string, data: Partial<Prompt>) {
    loading.value = true
    error.value = null
    try {
      const updated = await promptService.update(key, data)
      const index = items.value.findIndex(p => p.key === key)
      if (index !== -1) {
        items.value[index] = updated
      }
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : '更新失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function reload() {
    loading.value = true
    error.value = null
    try {
      items.value = await promptService.reload()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '重载失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    fetchAll,
    update,
    reload,
  }
})
