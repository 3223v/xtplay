<template>
  <div class="chat-view">
    <!-- Left: Conversation List -->
    <div class="conv-sidebar">
      <div class="conv-sidebar-header">
        <h3 class="conv-title">对话列表</h3>
        <el-button type="primary" size="small" @click="showCreateDialog = true">
          新建对话
        </el-button>
      </div>

      <div v-if="convStore.loading" class="conv-loading">加载中...</div>
      <div v-else-if="convStore.conversations.length === 0" class="conv-empty">
        还没有对话，选择一个角色开始吧
      </div>
      <div v-else class="conv-list">
        <div
          v-for="conv in convStore.conversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: conv.id === convStore.selectedId }"
          @click="convStore.select(conv.id)"
        >
          <div class="conv-item-avatar">
            {{ conv.role_name.charAt(0) || '?' }}
          </div>
          <div class="conv-item-info">
            <div class="conv-item-title">{{ conv.title || conv.role_name }}</div>
            <div class="conv-item-role">{{ conv.role_name }}</div>
          </div>
          <el-button
            text
            size="small"
            type="danger"
            class="conv-delete-btn"
            @click.stop="handleDelete(conv.id)"
            :loading="deletingId === conv.id"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- Right: Chat Area -->
    <div class="chat-main">
      <!-- No conversation selected -->
      <div v-if="!convStore.selectedId" class="chat-empty">
        <div class="chat-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <p>选择一个对话，或创建新对话开始聊天</p>
      </div>

      <!-- Chat active -->
      <template v-else>
        <!-- Chat Header -->
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="chat-header-title">{{ convStore.selectedConversation?.title || '对话' }}</div>
            <div class="chat-header-role">与 {{ convStore.selectedConversation?.role_name }} 对话中</div>
          </div>
          <div class="chat-header-actions">
            <el-button size="small" @click="loadMessages" :loading="convStore.loading">
              刷新
            </el-button>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-messages" ref="messagesRef">
          <div v-if="convStore.messages.length === 0" class="msg-empty">
            开始你们的对话吧
          </div>
          <div
            v-for="msg in convStore.messages"
            :key="msg.id"
            class="msg-item"
            :class="msg.role === 'user' ? 'msg-user' : 'msg-character'"
          >
            <div class="msg-avatar">
              {{ msg.role === 'user' ? '我' : (convStore.selectedConversation?.role_name.charAt(0) || '?') }}
            </div>
            <div class="msg-bubble">
              <div class="msg-role-label">{{ msg.role === 'user' ? '你' : convStore.selectedConversation?.role_name }}</div>
              <div v-if="msg.action" class="msg-action">（{{ msg.action }}）</div>
              <div v-if="msg.dialogue" class="msg-dialogue">{{ msg.dialogue }}</div>
            </div>
          </div>
          <div v-if="convStore.sending" class="msg-item msg-character">
            <div class="msg-avatar">{{ convStore.selectedConversation?.role_name.charAt(0) || '?' }}</div>
            <div class="msg-bubble msg-typing">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-container">
            <div class="input-field action-field">
              <div class="field-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <input
                v-model="actionInput"
                placeholder="动作（可选）"
                class="field-input"
                :disabled="convStore.sending"
              />
            </div>
            <div class="input-field dialogue-field">
              <div class="field-icon dialogue-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <textarea
                v-model="dialogueInput"
                placeholder="输入你的台词..."
                class="field-textarea"
                :disabled="convStore.sending"
                @keydown.enter.exact.prevent="handleSend"
              ></textarea>
              <button
                class="send-btn"
                :class="{ active: canSend, loading: convStore.sending }"
                :disabled="!canSend || convStore.sending"
                @click="handleSend"
              >
                <svg v-if="!convStore.sending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                <span v-else class="loading-spinner"></span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Create Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建对话" width="500px">
      <div v-if="roles.length === 0" class="no-roles-hint">
        你还没有创建角色，请先在「管理 → 角色」中创建角色。
      </div>
      <div v-else class="role-select-list">
        <div
          v-for="role in roles"
          :key="role.id"
          class="role-select-item"
          :class="{ selected: selectedRoleId === role.id }"
          @click="selectedRoleId = role.id"
        >
          <div class="role-select-avatar">{{ role.name.charAt(0) || '?' }}</div>
          <div class="role-select-info">
            <div class="role-select-name">{{ role.name }}</div>
            <div class="role-select-desc">{{ role.description || '暂无描述' }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedRoleId" :loading="creating" @click="handleCreate">
          开始对话
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { roleService } from '@/api'
import type { Role } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'

const convStore = useConversationStore()

const showCreateDialog = ref(false)
const selectedRoleId = ref<number | null>(null)
const creating = ref(false)
const roles = ref<Role[]>([])
const actionInput = ref('')
const dialogueInput = ref('')
const messagesRef = ref<HTMLElement | null>(null)
const deletingId = ref<number | null>(null)

const canSend = computed(() => actionInput.value.trim() || dialogueInput.value.trim())

async function loadRoles() {
  try {
    roles.value = await roleService.getAll()
  } catch {
    ElMessage.error('加载角色列表失败')
  }
}

async function handleCreate() {
  if (!selectedRoleId.value) return
  creating.value = true
  try {
    const role = roles.value.find(r => r.id === selectedRoleId.value)
    const conv = await convStore.create(selectedRoleId.value, role?.name)
    showCreateDialog.value = false
    selectedRoleId.value = null
    await convStore.select(conv.id)
    scrollToBottom()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除这个对话吗？所有消息将丢失。', '确认删除')
    deletingId.value = id
    await convStore.remove(id)
    ElMessage.success('已删除')
  } catch {
    // cancelled
  } finally {
    deletingId.value = null
  }
}

async function handleSend() {
  const action = actionInput.value.trim()
  const dialogue = dialogueInput.value.trim()
  if (!action && !dialogue) return

  await convStore.sendMessage(action, dialogue)
  actionInput.value = ''
  dialogueInput.value = ''
  scrollToBottom()
}

async function loadMessages() {
  if (convStore.selectedId) {
    await convStore.select(convStore.selectedId)
    scrollToBottom()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

watch(() => convStore.selectedId, () => {
  scrollToBottom()
})

watch(showCreateDialog, (val) => {
  if (val) {
    selectedRoleId.value = null
    loadRoles()
  }
})

onMounted(async () => {
  await convStore.fetchAll()
  const firstConv = convStore.conversations[0]
  if (firstConv && !convStore.selectedId) {
    await convStore.select(firstConv.id)
    scrollToBottom()
  }
})
</script>

<style scoped>
.chat-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* ===== Left Sidebar ===== */
.conv-sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
}

.conv-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.conv-title {
  font-size: var(--font-base);
  font-weight: 600;
  margin: 0;
}

.conv-loading,
.conv-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-sm);
}

.conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  margin-bottom: 2px;
}

.conv-item:hover {
  background: var(--primary-bg);
}

.conv-item.active {
  background: var(--primary-bg);
  border-left: 3px solid var(--primary);
}

.conv-item-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.conv-item-info {
  flex: 1;
  min-width: 0;
}

.conv-item-title {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-item-role {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.conv-delete-btn {
  opacity: 0;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}

.conv-item:hover .conv-delete-btn {
  opacity: 1;
}

/* ===== Chat Main ===== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  gap: 16px;
}

.chat-empty-icon {
  opacity: 0.4;
}

/* Chat Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.chat-header-title {
  font-size: var(--font-base);
  font-weight: 600;
}

.chat-header-role {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: linear-gradient(to bottom, var(--bg-main), var(--bg-card));
}

.msg-empty {
  text-align: center;
  color: var(--text-tertiary);
  padding: 60px 0;
  font-size: var(--font-base);
}

.msg-item {
  display: flex;
  gap: 12px;
  max-width: 75%;
  animation: msgSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes msgSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.msg-user {
  align-self: flex-end;
  flex-direction: row-reverse;
  animation-name: msgSlideInRight;
}

@keyframes msgSlideInRight {
  from {
    opacity: 0;
    transform: translateY(10px) translateX(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) translateX(0) scale(1);
  }
}

.msg-character {
  align-self: flex-start;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-sm);
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
}

.msg-user .msg-avatar {
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
}

.msg-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  line-height: var(--leading-relaxed);
  font-size: var(--font-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
}

.msg-character .msg-bubble {
  border-top-left-radius: 4px;
}

.msg-user .msg-bubble {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  border: none;
  border-top-right-radius: 4px;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.25);
}

.msg-role-label {
  font-size: var(--font-xs);
  font-weight: 600;
  margin-bottom: 6px;
  opacity: 0.7;
  letter-spacing: 0.02em;
}

.msg-user .msg-role-label {
  text-align: right;
}

.msg-action {
  color: var(--text-tertiary);
  font-style: italic;
  font-size: var(--font-sm);
  margin-bottom: 6px;
  padding-left: 8px;
  border-left: 2px solid var(--border);
}

.msg-user .msg-action {
  opacity: 0.85;
  border-left: none;
  border-right: 2px solid rgba(255, 255, 255, 0.3);
  padding-left: 0;
  padding-right: 8px;
  text-align: right;
}

.msg-dialogue {
  font-size: var(--font-base);
  line-height: 1.6;
}

/* Typing indicator */
.msg-typing {
  display: flex;
  gap: 4px;
  padding: 14px 18px;
  align-items: center;
  background: var(--bg-card);
  border-radius: 18px;
  border-top-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.msg-user .msg-typing {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-radius: 18px;
  border-top-right-radius: 4px;
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: typingBounce 1.4s infinite ease-in-out;
}

.msg-user .typing-dot {
  background: rgba(255, 255, 255, 0.7);
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Input Area */
.chat-input-area {
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border);
  background: linear-gradient(to top, var(--bg-card) 80%, transparent);
}

.input-container {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: box-shadow var(--transition-base), border-color var(--transition-base);
}

.input-container:focus-within {
  border-color: var(--primary-light);
  box-shadow: 0 4px 32px rgba(79, 70, 229, 0.12), 0 1px 4px rgba(79, 70, 229, 0.08);
}

.input-field {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.action-field {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-main);
}

.action-field .field-icon {
  color: var(--text-tertiary);
  opacity: 0.6;
}

.dialogue-field {
  padding: 12px 14px 12px 14px;
}

.dialogue-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.field-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.field-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--font-sm);
  color: var(--text-secondary);
  outline: none;
  font-family: inherit;
}

.field-input::placeholder {
  color: var(--text-tertiary);
  opacity: 0.7;
}

.field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-textarea {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--font-base);
  color: var(--text-primary);
  outline: none;
  resize: none;
  line-height: var(--leading-normal);
  font-family: inherit;
  min-height: 24px;
  max-height: 120px;
  overflow-y: auto;
}

.field-textarea::placeholder {
  color: var(--text-tertiary);
  opacity: 0.7;
}

.field-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--border);
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-base);
  margin-left: 8px;
}

.send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.send-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.send-btn.active:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
}

.send-btn.active:active {
  transform: scale(0.95);
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Create Dialog */
.no-roles-hint {
  text-align: center;
  padding: 40px 0;
  color: var(--text-tertiary);
}

.role-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.role-select-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.role-select-item:hover {
  border-color: var(--primary-light);
  background: var(--primary-bg);
}

.role-select-item.selected {
  border-color: var(--primary);
  background: var(--primary-bg);
}

.role-select-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-base);
  font-weight: 600;
  flex-shrink: 0;
}

.role-select-name {
  font-weight: 600;
  font-size: var(--font-base);
}

.role-select-desc {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
