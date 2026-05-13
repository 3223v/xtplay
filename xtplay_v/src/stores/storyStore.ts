import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Story } from '@/types'
import { storyService } from '@/api'

export const useStoryStore = defineStore('story', () => {
  const items = ref<Story[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<number | null>(null)

  const selectedItem = computed(() =>
    selectedId.value ? items.value.find(s => s.id === selectedId.value) || null : null
  )

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await storyService.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Story>) {
    loading.value = true
    error.value = null
    try {
      const created = await storyService.create(data)
      items.value.push(created)
      return created
    } catch (e) {
      error.value = e instanceof Error ? e.message : '创建失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id: number, data: Partial<Story>) {
    loading.value = true
    error.value = null
    try {
      const updated = await storyService.update(id, data)
      const index = items.value.findIndex(s => s.id === id)
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

  async function remove(id: number) {
    loading.value = true
    error.value = null
    try {
      await storyService.delete(id)
      items.value = items.value.filter(s => s.id !== id)
      if (selectedId.value === id) {
        selectedId.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '删除失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  function select(id: number | null) {
    selectedId.value = id
  }

  return {
    items,
    loading,
    error,
    selectedId,
    selectedItem,
    fetchAll,
    create,
    update,
    remove,
    select,
  }
})
