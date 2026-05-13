import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session, StoryRound, OpeningDraft } from '@/types'
import { sessionService } from '@/api'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedSessionId = ref<number | null>(null)
  const generating = ref(false)
  const creatingOpening = ref(false)
  const openingDraft = ref<OpeningDraft | null>(null)
  const savingOpening = ref(false)
  const editingRoundId = ref<number | null>(null)
  const savingEdit = ref(false)
  const autoAdvanceEnabled = ref(false)
  const autoAdvanceDelay = ref(30)

  const selectedSession = computed(() =>
    selectedSessionId.value
      ? sessions.value.find(s => s.id === selectedSessionId.value) || null
      : null
  )

  const hasOpening = computed(() => (selectedSession.value?.round?.length ?? 0) > 0)

  async function fetchByStory(storyId: number) {
    loading.value = true
    error.value = null
    try {
      sessions.value = await sessionService.listByStory(storyId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载会话失败'
    } finally {
      loading.value = false
    }
  }

  async function create(storyId: number, data?: Partial<Session>) {
    loading.value = true
    error.value = null
    try {
      const created = await sessionService.create(storyId, data)
      sessions.value.push(created)
      return created
    } catch (e) {
      error.value = e instanceof Error ? e.message : '创建会话失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(sessionId: number, data: Partial<Session>) {
    loading.value = true
    error.value = null
    try {
      const updated = await sessionService.update(sessionId, data)
      const index = sessions.value.findIndex(s => s.id === sessionId)
      if (index !== -1) {
        sessions.value[index] = updated
      }
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : '更新会话失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(sessionId: number) {
    loading.value = true
    error.value = null
    try {
      await sessionService.delete(sessionId)
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      if (selectedSessionId.value === sessionId) {
        selectedSessionId.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '删除会话失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function generateOpening(sessionId: number) {
    creatingOpening.value = true
    error.value = null
    try {
      openingDraft.value = await sessionService.generateOpening(sessionId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成开场失败'
      throw e
    } finally {
      creatingOpening.value = false
    }
  }

  async function createRound(sessionId: number, data: Partial<StoryRound>) {
    savingOpening.value = true
    error.value = null
    try {
      const created = await sessionService.createRound(sessionId, data)
      const session = sessions.value.find(s => s.id === sessionId)
      if (session) {
        session.round = [...(session.round || []), created]
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

  async function generateRound(sessionId: number) {
    generating.value = true
    error.value = null
    try {
      const newRound = await sessionService.generateRound(sessionId)
      const session = sessions.value.find(s => s.id === sessionId)
      if (session) {
        session.round = [...(session.round || []), newRound]
      }
      return newRound
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败'
      throw e
    } finally {
      generating.value = false
    }
  }

  async function updateRound(sessionId: number, roundId: number, data: Partial<StoryRound>) {
    savingEdit.value = true
    error.value = null
    try {
      const updated = await sessionService.updateRound(sessionId, roundId, data)
      const session = sessions.value.find(s => s.id === sessionId)
      if (session && session.round) {
        const index = session.round.findIndex(r => r.id === roundId)
        if (index !== -1) {
          session.round[index] = updated
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

  function select(sessionId: number | null) {
    selectedSessionId.value = sessionId
    openingDraft.value = null
    editingRoundId.value = null
    autoAdvanceEnabled.value = false
    generating.value = false
    creatingOpening.value = false
    savingOpening.value = false
    savingEdit.value = false
  }

  function startEditRound(roundId: number) {
    editingRoundId.value = roundId
  }

  function cancelEdit() {
    editingRoundId.value = null
  }

  return {
    sessions,
    loading,
    error,
    selectedSessionId,
    selectedSession,
    generating,
    creatingOpening,
    openingDraft,
    savingOpening,
    editingRoundId,
    savingEdit,
    autoAdvanceEnabled,
    autoAdvanceDelay,
    hasOpening,
    fetchByStory,
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
