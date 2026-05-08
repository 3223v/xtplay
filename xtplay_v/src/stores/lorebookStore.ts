import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Lorebook } from '@/types'
import { lorebookService } from '@/api'

export const useLorebookStore = defineStore('lorebook', () => {
  const items = ref<Lorebook[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<number | null>(null)

  const selectedItem = computed(() =>
    selectedId.value ? items.value.find(l => l.id === selectedId.value) || null : null
  )

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await lorebookService.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Lorebook>) {
    loading.value = true
    error.value = null
    try {
      const created = await lorebookService.create(data)
      items.value.push(created)
      return created
    } catch (e) {
      error.value = e instanceof Error ? e.message : '创建失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id: number, data: Partial<Lorebook>) {
    loading.value = true
    error.value = null
    try {
      const updated = await lorebookService.update(id, data)
      const index = items.value.findIndex(l => l.id === id)
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
      await lorebookService.delete(id)
      items.value = items.value.filter(l => l.id !== id)
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
