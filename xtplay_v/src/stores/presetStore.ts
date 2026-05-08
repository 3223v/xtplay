import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Preset } from '@/types'
import { presetService } from '@/api'

export const usePresetStore = defineStore('preset', () => {
  const items = ref<Preset[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<number | null>(null)

  const selectedItem = computed(() =>
    selectedId.value ? items.value.find(p => p.id === selectedId.value) || null : null
  )

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await presetService.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Preset>) {
    loading.value = true
    error.value = null
    try {
      const created = await presetService.create(data)
      items.value.push(created)
      return created
    } catch (e) {
      error.value = e instanceof Error ? e.message : '创建失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id: number, data: Partial<Preset>) {
    loading.value = true
    error.value = null
    try {
      const updated = await presetService.update(id, data)
      const index = items.value.findIndex(p => p.id === id)
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
      await presetService.delete(id)
      items.value = items.value.filter(p => p.id !== id)
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
