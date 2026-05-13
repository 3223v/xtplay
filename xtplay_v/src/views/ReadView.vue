<template>
  <div class="read-layout">
    <!-- 左侧故事列表 -->
    <aside class="story-list" :class="{ collapsed: sidebarCollapsed }">
      <div class="story-list-inner">
        <div class="story-list-header">
          <h2 class="story-list-title">阅读</h2>
          <span class="story-count">{{ storyStore.items.length }} 个故事</span>
        </div>
        <div class="story-list-body">
          <div v-if="storiesLoading" class="story-list-status">
            <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>加载中...</span>
          </div>
          <div v-else-if="storiesError" class="story-list-status error">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>加载失败</span>
            <button class="retry-btn" @click="loadStories">重试</button>
          </div>
          <template v-else>
            <div
              v-for="story in storyStore.items"
              :key="story.id"
              class="story-list-item"
              :class="{ active: storyStore.selectedId === story.id }"
              @click="handleSelectStory(story)"
            >
              <div class="story-item-avatar">{{ (story.title || '?').charAt(0).toUpperCase() }}</div>
              <div class="story-item-content">
                <div class="story-item-title">{{ story.title || '未命名' }}</div>
                <div class="story-item-meta">
                  <span v-if="!canReadStory(story)" class="meta-warning">缺角色</span>
                  <span>{{ getSessionCount(story.id) }} 个会话</span>
                </div>
              </div>
            </div>
            <div v-if="storyStore.items.length === 0" class="story-list-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
              <p>暂无故事</p>
            </div>
          </template>
        </div>
      </div>
    </aside>
    <button class="sidebar-toggle" :class="{ collapsed: sidebarCollapsed }" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? '展开列表' : '收起列表'">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <polyline v-if="!sidebarCollapsed" points="15 18 9 12 15 6" />
        <polyline v-else points="9 18 15 12 9 6" />
      </svg>
    </button>

    <!-- 右侧阅读区 -->
    <main class="reader">
      <template v-if="storyStore.selectedItem">
        <!-- 阅读器头部 -->
        <div class="reader-header">
          <div class="reader-title-area">
            <h1 class="reader-title">{{ storyStore.selectedItem.title || '未命名故事' }}</h1>
            <div class="reader-meta">
              <span v-if="sessionStore.selectedSession">
                共 {{ sessionStore.selectedSession.round?.length || 0 }} 轮 · {{ totalChars }} 字
              </span>
            </div>
          </div>
          <div class="reader-actions">
            <template v-if="sessionStore.selectedSession && sessionStore.hasOpening">
              <div class="auto-advance">
                <button
                  class="auto-btn"
                  :class="{ active: autoAdvanceEnabled }"
                  @click="toggleAutoAdvance"
                  :title="autoAdvanceEnabled ? '关闭自动推进' : '开启自动推进'"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  {{ autoAdvanceEnabled ? '自动推进中' : '自动推进' }}
                </button>
                <input
                  v-if="autoAdvanceEnabled"
                  v-model.number="autoAdvanceDelay"
                  type="number"
                  class="delay-input"
                  min="0"
                  max="120"
                />
                <span v-if="autoAdvanceEnabled" class="delay-unit">秒</span>
              </div>
            </template>
            <button
              v-if="sessionStore.selectedSession"
              class="btn-primary"
              :disabled="!canReadStory(storyStore.selectedItem) || sessionStore.generating || sessionsLoading"
              @click="handleGenerateRound"
            >
              <svg v-if="sessionStore.generating" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {{ sessionStore.generating ? '生成中...' : sessionStore.hasOpening ? '下一轮' : '开始' }}
            </button>
          </div>
        </div>

        <!-- 会话选择器 -->
        <div class="session-bar">
          <div class="session-tabs">
            <div v-if="sessionsLoading" class="session-loading-hint">
              <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              加载中...
            </div>
            <button
              v-for="s in sessionStore.sessions"
              :key="s.id"
              class="session-tab"
              :class="{ active: sessionStore.selectedSessionId === s.id }"
              @click="handleSelectSession(s.id)"
            >
              {{ s.title || '未命名会话' }}
              <span class="session-round-count">{{ s.round?.length || 0 }}</span>
            </button>
          </div>
          <button
            class="new-session-btn"
            :disabled="sessionsLoading"
            @click="handleNewSession"
            :title="'新建会话'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建
          </button>
        </div>

        <!-- 阅读内容 -->
        <div class="reader-content">
          <div v-if="!canReadStory(storyStore.selectedItem)" class="reader-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>必须同时设置角色 1 和角色 2 后，才可以生成双人小说。</span>
          </div>

          <!-- 无会话时提示 -->
          <div v-else-if="sessions.length === 0 && !sessionsLoading" class="reader-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="64" height="64"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <h3>开始阅读</h3>
            <p>为该故事创建一个新会话以开始阅读。</p>
            <button class="btn-primary" style="margin-top: 16px" :disabled="sessionsLoading" @click="handleNewSession">
              创建新会话
            </button>
          </div>

          <!-- 开场面板 -->
          <OpeningPanel
            v-else-if="sessionStore.openingDraft"
            :key="'opening-' + sessionStore.selectedSessionId"
            :session-id="sessionStore.selectedSessionId!"
            :role1-name="role1Name"
            :role2-name="role2Name"
          />

          <!-- 已有轮次 -->
          <template v-else-if="sessionStore.hasOpening && sessionStore.selectedSession">
            <div class="current-scene-banner">
              <span class="scene-banner-label">当前场景</span>
              <p class="scene-banner-text">{{ lastScene }}</p>
            </div>

            <RoundCard
              v-for="(round, index) in reversedRounds"
              :key="round.id"
              :round="round"
              :round-index="originalIndex(index)"
              :role1-name="role1Name"
              :role2-name="role2Name"
              :is-first="index === 0"
              :is-editing="sessionStore.editingRoundId === round.id"
              :edit-values="getEditValues(round.id)"
              :saving="sessionStore.savingEdit"
              @start-edit="handleStartEdit(round)"
              @cancel-edit="handleCancelEdit"
              @save-edit="handleSaveEdit(round.id)"
              @edit-change="(field: any, value: string) => handleEditChange(round.id, field, value)"
            />
          </template>

          <!-- 空状态（有会话无轮次） -->
          <div v-else-if="sessionStore.selectedSession" class="reader-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="64" height="64"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <h3>开始创作</h3>
            <p>第一次点击「开始」不会直接生成角色输出。<br>请先填写初始场景和旁白，也可以让 AI 根据两个角色自动生成。</p>
          </div>
        </div>
      </template>

      <!-- 未选择故事 -->
      <div v-else class="reader-welcome">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="80" height="80"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
        <h2>选择故事开始阅读</h2>
        <p>从左侧列表选择一个故事</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useStoryStore, useSessionStore } from '@/stores'
import type { Story, StoryRound } from '@/types'
import RoundCard from '@/components/RoundCard.vue'
import OpeningPanel from '@/components/OpeningPanel.vue'

const storyStore = useStoryStore()
const sessionStore = useSessionStore()

const sidebarCollapsed = ref(false)
const autoAdvanceTimer = ref<number | null>(null)

// 用于防止跨会话生成：记录自动推进绑定的会话 ID
const autoAdvanceSessionId = ref<number | null>(null)

// 本地管理 auto-advance 状态（不与 store select 联动）
const autoAdvanceEnabled = ref(false)
const autoAdvanceDelay = ref(30)

// 加载状态（本地管理，避免依赖 store 的 loading 污染其他组件）
const storiesLoading = ref(false)
const storiesError = ref(false)
const sessionsLoading = ref(false)

// 每个轮次的编辑草稿，keyed by round.id
const editDrafts = reactive<Record<number, { next_scene: string; next_narration: string }>>({})

const sessions = computed(() => sessionStore.sessions)

const reversedRounds = computed(() =>
  [...(sessionStore.selectedSession?.round || [])].reverse()
)

const totalChars = computed(() => {
  const rounds = sessionStore.selectedSession?.round || []
  return rounds.reduce((count, r) => {
    return count +
      (r.scene || '').length +
      (r.narration || '').length +
      (r.next_scene || '').length +
      (r.next_narration || '').length +
      (r.role1_action || '').length +
      (r.role1_dialogue || '').length +
      (r.role2_action || '').length +
      (r.role2_dialogue || '').length
  }, 0)
})

const role1Name = computed(() => (storyStore.selectedItem?.role1?.name as string) || '角色 1')
const role2Name = computed(() => (storyStore.selectedItem?.role2?.name as string) || '角色 2')

const lastScene = computed(() => {
  if (!storyStore.selectedItem) return ''
  const rounds = sessionStore.selectedSession?.round || []
  const latest = [...rounds].reverse().find(r => r.next_scene || r.scene)
  return (latest?.next_scene || latest?.scene || storyStore.selectedItem.initial_scene || '尚未设置场景') as string
})

function getSessionCount(storyId: number): number {
  // sessionStore.sessions 是当前加载的故事的会话列表
  // 侧边栏显示的是当前故事的所有会话数
  if (storyId === storyStore.selectedId) {
    return sessionStore.sessions.length
  }
  return 0
}

function canReadStory(story: Story): boolean {
  return Boolean(story.role1?.name && story.role2?.name)
}

function originalIndex(reversedIndex: number): number {
  return reversedRounds.value.length - 1 - reversedIndex
}

function getEditValues(roundId: number) {
  const draft = editDrafts[roundId]
  if (!draft) {
    return { next_scene: '', next_narration: '' }
  }
  return draft
}

// 集中管理 story 加载
async function loadStories() {
  storiesLoading.value = true
  storiesError.value = false
  try {
    await storyStore.fetchAll()
  } catch {
    storiesError.value = true
  } finally {
    storiesLoading.value = false
  }
}

// 加载会话列表，可选保留当前选中
async function loadSessions(storyId: number, keepSelection = false) {
  sessionsLoading.value = true
  try {
    await sessionStore.fetchByStory(storyId)
  } catch {
    ElMessage.error('加载会话失败')
  } finally {
    sessionsLoading.value = false
  }
  // 加载完后自动选择最新会话
  if (!keepSelection && sessionStore.sessions.length > 0) {
    const last = sessionStore.sessions[sessionStore.sessions.length - 1]
    if (last) {
      sessionStore.select(last.id)
    }
  }
}

function clearAutoAdvance() {
  if (autoAdvanceTimer.value !== null) {
    clearTimeout(autoAdvanceTimer.value)
    autoAdvanceTimer.value = null
  }
  autoAdvanceSessionId.value = null
}

function toggleAutoAdvance() {
  autoAdvanceEnabled.value = !autoAdvanceEnabled.value
  if (!autoAdvanceEnabled.value) {
    clearAutoAdvance()
  } else {
    scheduleAutoAdvance()
  }
}

function scheduleAutoAdvance() {
  clearAutoAdvance()
  if (!autoAdvanceEnabled.value) return
  const session = sessionStore.selectedSession
  if (!session || !sessionStore.hasOpening || sessionStore.generating) return

  autoAdvanceSessionId.value = session.id
  autoAdvanceTimer.value = window.setTimeout(async () => {
    autoAdvanceTimer.value = null
    // 检查是否仍然在正确的会话上
    if (autoAdvanceSessionId.value !== sessionStore.selectedSessionId) {
      autoAdvanceSessionId.value = null
      return
    }
    if (sessionStore.generating) {
      // 如果正在生成，等待完成后重新调度
      const unwatch = watch(() => sessionStore.generating, (val) => {
        if (!val) {
          unwatch()
          scheduleAutoAdvance()
        }
      })
      return
    }
    await handleGenerateRound()
    // 生成完成后调度下一轮
    if (autoAdvanceEnabled.value && autoAdvanceSessionId.value === sessionStore.selectedSessionId) {
      scheduleAutoAdvance()
    }
  }, autoAdvanceDelay.value * 1000)
}

watch([autoAdvanceEnabled, autoAdvanceDelay], () => {
  if (autoAdvanceEnabled.value) {
    scheduleAutoAdvance()
  } else {
    clearAutoAdvance()
  }
})

// 当新轮次生成完毕时，若自动推进开启则调度下一轮
watch(() => sessionStore.selectedSession?.round?.length, () => {
  if (autoAdvanceEnabled.value && sessionStore.hasOpening && !sessionStore.generating) {
    scheduleAutoAdvance()
  }
})

// 当 selectedSessionId 变化时，清理自动推进
watch(() => sessionStore.selectedSessionId, () => {
  if (autoAdvanceEnabled.value) {
    clearAutoAdvance()
  }
})

onMounted(async () => {
  await loadStories()
  // 如果有之前选中的故事，自动加载会话
  if (storyStore.selectedId) {
    await loadSessions(storyStore.selectedId)
  }
})

onUnmounted(() => {
  clearAutoAdvance()
})

async function handleSelectStory(story: Story) {
  clearAutoAdvance()
  autoAdvanceEnabled.value = false
  storyStore.select(story.id)
  sessionStore.select(null)

  if (!canReadStory(story)) {
    ElMessage.warning('阅读必须包含两个角色，请先到故事管理里设置角色 1 和角色 2。')
  }

  await loadSessions(story.id)
}

async function handleSelectSession(sessionId: number) {
  clearAutoAdvance()
  autoAdvanceEnabled.value = false

  // 如果会话数据已经就绪，直接选择
  if (sessionStore.sessions.some(s => s.id === sessionId)) {
    sessionStore.select(sessionId)
  } else {
    // 回退：重新加载
    if (storyStore.selectedId) {
      await loadSessions(storyStore.selectedId)
      sessionStore.select(sessionId)
    }
  }

  const contentEl = document.querySelector('.reader-content')
  if (contentEl) contentEl.scrollTop = 0
}

async function handleNewSession() {
  if (!storyStore.selectedId) return
  clearAutoAdvance()
  autoAdvanceEnabled.value = false

  try {
    const created = await sessionStore.create(storyStore.selectedId, { title: '新会话' })
    sessionStore.select(created.id)
    const contentEl = document.querySelector('.reader-content')
    if (contentEl) contentEl.scrollTop = 0
    ElMessage.success('新会话已创建')
  } catch {
    ElMessage.error('创建会话失败')
  }
}

async function handleGenerateRound() {
  const sessionId = sessionStore.selectedSessionId
  if (sessionId === null || sessionStore.generating) {
    ElMessage.warning('请先选择一个会话')
    return
  }

  const session = sessionStore.selectedSession
  if (!session) return

  if (!sessionStore.hasOpening) {
    // 没有开场，显示开场面板
    sessionStore.openingDraft = { scene: '', narration: '', first: 'role1' }
    return
  }

  try {
    await sessionStore.generateRound(sessionId)
    // 生成成功后滚动到顶部以展示最新内容
    const contentEl = document.querySelector('.reader-content')
    if (contentEl) contentEl.scrollTop = 0
  } catch (error) {
    console.error('生成失败:', error)
    ElMessage.error('生成失败')
  }
}

function handleStartEdit(round: StoryRound) {
  // 初始化该轮次的编辑草稿
  editDrafts[round.id] = {
    next_scene: round.next_scene || '',
    next_narration: round.next_narration || '',
  }
  sessionStore.startEditRound(round.id)
}

function handleCancelEdit() {
  if (sessionStore.editingRoundId !== null) {
    delete editDrafts[sessionStore.editingRoundId]
  }
  sessionStore.cancelEdit()
}

function handleEditChange(roundId: number, field: 'next_scene' | 'next_narration', value: string) {
  if (!editDrafts[roundId]) {
    editDrafts[roundId] = { next_scene: '', next_narration: '' }
  }
  editDrafts[roundId][field] = value
}

async function handleSaveEdit(roundId: number) {
  if (!sessionStore.selectedSession) return
  const draft = editDrafts[roundId]
  if (!draft) return

  try {
    await sessionStore.updateRound(sessionStore.selectedSession.id, roundId, {
      next_scene: draft.next_scene,
      next_narration: draft.next_narration,
    })
    delete editDrafts[roundId]
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped>
.read-layout {
  display: flex;
  height: 100vh;
}

/* ===== 左侧故事列表 ===== */
.story-list {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  position: relative;
  transition: width var(--transition-base);
  overflow: hidden;
}

.story-list.collapsed {
  width: 0;
  border-right: none;
}

.story-list-inner {
  width: 280px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-toggle {
  flex-shrink: 0;
  width: 20px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-left: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
}

.sidebar-toggle:hover {
  color: var(--primary);
  background: var(--primary-bg);
}

.sidebar-toggle.collapsed {
  border-left: none;
  border-right: 1px solid var(--border);
}

.story-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.story-list-title {
  font-size: var(--font-lg);
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.story-count {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.story-list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.story-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 2px;
}

.story-list-item:hover {
  background: var(--bg-main);
}

.story-list-item.active {
  background: var(--primary-bg);
}

.story-item-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--primary-bg);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.story-list-item.active .story-item-avatar {
  background: var(--primary);
  color: white;
}

.story-item-content {
  flex: 1;
  min-width: 0;
}

.story-item-title {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.story-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.meta-warning {
  color: #ef4444;
  font-weight: 500;
}

.story-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: var(--text-tertiary);
}

.story-list-empty svg {
  opacity: 0.3;
  margin-bottom: 12px;
}

.story-list-empty p {
  font-size: var(--font-sm);
  margin: 0;
}

.story-list-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: var(--text-tertiary);
  font-size: var(--font-sm);
}

.story-list-status.error {
  color: #ef4444;
}

.retry-btn {
  margin-top: 4px;
  padding: 4px 14px;
  border: 1px solid #ef4444;
  border-radius: var(--radius-sm);
  background: transparent;
  color: #ef4444;
  font-size: var(--font-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.retry-btn:hover {
  background: #fef2f2;
}

/* ===== 阅读器 ===== */
.reader {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fefcf6;
  overflow: hidden;
}

.reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px 8px;
  border-bottom: 1px solid #e8e0d0;
  background: #fefcf6;
}

.reader-title-area {
  min-width: 0;
}

.reader-title {
  font-size: var(--font-xl);
  font-weight: 700;
  color: #292524;
  margin: 0;
}

.reader-meta {
  font-size: var(--font-xs);
  color: #a8a29e;
  margin-top: 4px;
}

.reader-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.auto-advance {
  display: flex;
  align-items: center;
  gap: 6px;
}

.auto-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e8e0d0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: #78716c;
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.auto-btn:hover {
  border-color: var(--primary-light);
  color: var(--primary);
}

.auto-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.delay-input {
  width: 56px;
  padding: 4px 8px;
  border: 1px solid #e8e0d0;
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  text-align: center;
  outline: none;
  font-family: var(--font-sans);
  background: white;
}

.delay-input:focus {
  border-color: var(--primary-light);
}

.delay-unit {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-light);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 会话栏 */
.session-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 28px;
  background: #fefcf6;
  border-bottom: 1px solid #e8e0d0;
}

.session-tabs {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
  align-items: center;
}

.session-loading-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-xs);
  color: #a8a29e;
  padding: 6px 4px;
}

.session-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #e8e0d0;
  border-radius: var(--radius-md);
  background: transparent;
  color: #78716c;
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
  white-space: nowrap;
}

.session-tab:hover {
  border-color: var(--primary-light);
  color: var(--primary);
  background: #f5f3ff;
}

.session-tab.active {
  border-color: var(--primary);
  background: var(--primary);
  color: white;
}

.session-round-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(0,0,0,0.08);
  color: inherit;
}

.session-tab.active .session-round-count {
  background: rgba(255,255,255,0.25);
}

.new-session-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px dashed #d6d3d1;
  border-radius: var(--radius-md);
  background: transparent;
  color: #a8a29e;
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
  white-space: nowrap;
  flex-shrink: 0;
}

.new-session-btn:hover:not(:disabled) {
  border-color: var(--primary-light);
  color: var(--primary);
  background: #f5f3ff;
}

.new-session-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 阅读内容 */
.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.reader-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: #dc2626;
  font-size: var(--font-sm);
}

.current-scene-banner {
  background: #faf5eb;
  border: 1px solid #e8e0d0;
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 24px;
}

.scene-banner-label {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: #a8a29e;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.scene-banner-text {
  font-size: var(--font-base);
  line-height: var(--leading-relaxed);
  color: #44403c;
  margin: 0;
  font-family: var(--font-sans);
}

.reader-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 0;
  color: #a8a29e;
}

.reader-empty svg {
  opacity: 0.2;
  margin-bottom: 20px;
}

.reader-empty h3 {
  font-size: var(--font-xl);
  font-weight: 600;
  color: #78716c;
  margin: 0 0 8px;
}

.reader-empty p {
  font-size: var(--font-sm);
  color: #a8a29e;
  margin: 0;
  line-height: 1.8;
}

.reader-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  color: #a8a29e;
}

.reader-welcome svg {
  opacity: 0.15;
  margin-bottom: 20px;
}

.reader-welcome h2 {
  font-size: var(--font-xl);
  font-weight: 600;
  color: #78716c;
  margin: 0 0 8px;
}

.reader-welcome p {
  font-size: var(--font-sm);
  margin: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
