import { fetchJson } from '@/utils/api'
import type { Conversation, ConversationMessage, SendMessageResponse } from '@/types'

export const conversationService = {
  async getAll(): Promise<Conversation[]> {
    return fetchJson<Conversation[]>('/conversations')
  },

  async getById(id: number): Promise<Conversation> {
    return fetchJson<Conversation>(`/conversations/${id}`)
  },

  async create(data: { role_id: number; title?: string }): Promise<Conversation> {
    return fetchJson<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: number, data: Partial<Conversation>): Promise<Conversation> {
    return fetchJson<Conversation>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<void> {
    return fetchJson<void>(`/conversations/${id}`, { method: 'DELETE' })
  },

  async listMessages(conversationId: number): Promise<ConversationMessage[]> {
    return fetchJson<ConversationMessage[]>(`/conversations/${conversationId}/messages`)
  },

  async sendMessage(
    conversationId: number,
    action: string,
    dialogue: string,
  ): Promise<SendMessageResponse> {
    return fetchJson<SendMessageResponse>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ action, dialogue }),
    })
  },
}
