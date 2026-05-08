import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Story, StoryRound, OpeningDraft } from '@/types'
import { storyService } from '@/api'

export const useStoryStore = defineStore('story', () => {
  const items = ref<Story[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<number | null>(null)
  const generating = ref(false)
  const creatingOpening = ref(false)
  const openingDraft = ref<OpeningDraft | null>(null)
  const savingOpening = ref(false)
  const editingRoundId = ref<number | null>(null)
  const savingEdit = ref(false)
  const autoAdvanceEnabled = ref(false)
  const autoAdvanceDelay = ref(30)

  const selectedItem = computed(() =>
    selectedId.value ? items.value.find(s => s.id === selectedId.value) || null : null
  )

  const hasOpening = computed(() => (selectedItem.value?.round?.length ?? 0) > 0)

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

  async function generateOpening(storyId: number) {
    creatingOpening.value = true
    error.value = null
    try {
      openingDraft.value = await storyService.generateOpening(storyId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成开场失败'
      throw e
    } finally {
      creatingOpening.value = false
    }
  }

  async function createRound(storyId: number, data: Partial<StoryRound>) {
    savingOpening.value = true
    error.value = null
    try {
      const created = await storyService.createRound(storyId, data)
      const story = items.value.find(s => s.id === storyId)
      if (story) {
        story.round = [...(story.round || []), created]
      }
      openingDraft.value = null
      return created
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存开场失败'
      throw e
    } finally {
      savingOpening.value = false
    }
  }

  async function generateRound(storyId: number) {
    generating.value = true
    error.value = null
    try {
      const newRound = await storyService.generateRound(storyId)
      const story = items.value.find(s => s.id === storyId)
      if (story) {
        story.round = [...(story.round || []), newRound]
      }
      return newRound
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败'
      throw e
    } finally {
      generating.value = false
    }
  }

  async function updateRound(storyId: number, roundId: number, data: Partial<StoryRound>) {
    savingEdit.value = true
    error.value = null
    try {
      const updated = await storyService.updateRound(storyId, roundId, data)
      const story = items.value.find(s => s.id === storyId)
      if (story && story.round) {
        const index = story.round.findIndex(r => r.id === roundId)
        if (index !== -1) {
          story.round[index] = updated
        }
      }
      editingRoundId.value = null
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败'
      throw e
    } finally {
      savingEdit.value = false
    }
  }

  function select(id: number | null) {
    selectedId.value = id
    openingDraft.value = null
    editingRoundId.value = null
    autoAdvanceEnabled.value = false
  }

  function startEditRound(roundId: number) {
    editingRoundId.value = roundId
  }

  function cancelEdit() {
    editingRoundId.value = null
  }

  return {
    items,
    loading,
    error,
    selectedId,
    selectedItem,
    generating,
    creatingOpening,
    openingDraft,
    savingOpening,
    editingRoundId,
    savingEdit,
    autoAdvanceEnabled,
    autoAdvanceDelay,
    hasOpening,
    fetchAll,
    create,
    update,
    remove,
    select,
    generateOpening,
    createRound,
    generateRound,
    updateRound,
    startEditRound,
    cancelEdit,
    setAutoAdvance: (enabled: boolean) => { autoAdvanceEnabled.value = enabled },
    setAutoAdvanceDelay: (delay: number) => { autoAdvanceDelay.value = delay },
  }
})
