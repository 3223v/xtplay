import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Conversation, ConversationMessage } from '@/types'
import { conversationService } from '@/api'

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([])
  const messages = ref<ConversationMessage[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<number | null>(null)

  const selectedConversation = computed(() =>
    selectedId.value
      ? conversations.value.find(c => c.id === selectedId.value) || null
      : null
  )

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      conversations.value = await conversationService.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载会话列表失败'
    } finally {
      loading.value = false
    }
  }

  async function create(roleId: number, title?: string) {
    loading.value = true
    error.value = null
    try {
      const conv = await conversationService.create({ role_id: roleId, title })
      conversations.value.unshift(conv)
      return conv
    } catch (e) {
      error.value = e instanceof Error ? e.message : '创建会话失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(id: number) {
    loading.value = true
    error.value = null
    try {
      await conversationService.delete(id)
      conversations.value = conversations.value.filter(c => c.id !== id)
      if (selectedId.value === id) {
        selectedId.value = null
        messages.value = []
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '删除会话失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function select(id: number) {
    selectedId.value = id
    messages.value = []
    error.value = null
    try {
      messages.value = await conversationService.listMessages(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载消息失败'
    }
  }

  async function sendMessage(action: string, dialogue: string) {
    if (!selectedId.value) return
    sending.value = true
    error.value = null
    try {
      const result = await conversationService.sendMessage(selectedId.value, action, dialogue)
      messages.value.push(result.user_message)
      messages.value.push(result.character_message)
      const conv = conversations.value.find(c => c.id === selectedId.value)
      if (conv) {
        conv.updated_at = new Date().toISOString()
      }
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : '发送消息失败'
      throw e
    } finally {
      sending.value = false
    }
  }

  async function updateTitle(id: number, title: string) {
    try {
      const updated = await conversationService.update(id, { title } as any)
      const index = conversations.value.findIndex(c => c.id === id)
      if (index !== -1) {
        conversations.value[index] = updated
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '更新标题失败'
    }
  }

  return {
    conversations,
    messages,
    loading,
    sending,
    error,
    selectedId,
    selectedConversation,
    fetchAll,
    create,
    remove,
    select,
    sendMessage,
    updateTitle,
  }
})
