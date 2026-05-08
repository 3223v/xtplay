<template>
  <div class="read-layout">
    <div class="list-panel">
      <div class="list-header">
        <h2 class="list-title">阅读</h2>
        <span class="list-count">{{ store.items.length }} 个故事</span>
      </div>
      <el-scrollbar height="100%">
        <div
          v-for="story in store.items"
          :key="story.id"
          class="list-item"
          :class="{ active: store.selectedId === story.id }"
          @click="handleSelectStory(story)"
        >
          <div class="item-content">
            <div class="item-title">{{ story.title || '未命名' }}</div>
            <div class="item-meta">
              <el-tag v-if="!canReadStory(story)" size="small" type="danger">缺角色</el-tag>
              <span class="item-round">{{ story.round?.length || 0 }} 轮</span>
            </div>
            <p v-if="story.description" class="item-desc">{{ story.description }}</p>
          </div>
        </div>
        <el-empty v-if="store.items.length === 0" description="暂无故事" />
      </el-scrollbar>
    </div>
    <div class="content-panel">
      <template v-if="store.selectedItem">
        <div class="content-header">
          <div>
            <h3 class="content-title">{{ store.selectedItem.title || '未命名故事' }}</h3>
            <div class="content-meta">
              <span>{{ store.selectedItem.round?.length || 0 }} 轮</span>
              <span>{{ totalChars }} 字</span>
            </div>
          </div>
          <div class="content-actions">
            <template v-if="store.hasOpening">
              <el-button
                :type="store.autoAdvanceEnabled ? 'primary' : 'default'"
                size="small"
                @click="toggleAutoAdvance"
              >
                {{ store.autoAdvanceEnabled ? '自动推进中' : '自动推进' }}
              </el-button>
              <el-input-number
                v-model="store.autoAdvanceDelay"
                :min="0"
                :max="120"
                size="small"
                controls-position="right"
                class="delay-input"
              />
              <span class="delay-label">秒</span>
            </template>
            <el-button
              type="primary"
              size="small"
              :loading="store.generating"
              :disabled="!canReadStory(store.selectedItem) || store.generating"
              @click="handleGenerateRound"
            >
              {{ store.hasOpening ? '下一轮' : '开始' }}
            </el-button>
          </div>
        </div>
        <el-scrollbar height="calc(100% - 60px)">
          <div class="content-body">
            <el-alert v-if="!canReadStory(store.selectedItem)" type="error" show-icon :closable="false">
              必须同时设置角色 1 和角色 2 后，才可以生成双人小说。
            </el-alert>

            <template v-else-if="store.openingDraft">
              <opening-panel />
            </template>

            <template v-else-if="store.hasOpening">
              <div class="current-scene">
                <div class="scene-header">
                  <el-icon><House /></el-icon>
                  <span>当前场景</span>
                </div>
                <p class="scene-text">{{ lastScene }}</p>
              </div>
              <round-card
                v-for="(round, index) in reversedRounds"
                :key="round.id"
                :round="round"
                :role1-name="role1Name"
                :role2-name="role2Name"
                :is-first="index === 0"
                :is-editing="store.editingRoundId === round.id"
                :edit-values="editValues"
                :saving="store.savingEdit"
                @start-edit="handleStartEdit(round)"
                @cancel-edit="handleCancelEdit"
                @save-edit="handleSaveEdit(round.id)"
                @edit-change="handleEditChange"
              />
            </template>

            <el-empty v-else description="第一次点击开始不会直接生成角色输出。请先填写初始场景和旁白，也可以让 AI 根据两个角色自动生成。" />
          </div>
        </el-scrollbar>
      </template>
      <el-empty v-else description="从左侧列表选择故事开始阅读" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { House } from '@element-plus/icons-vue'
import { useStoryStore } from '@/stores'
import type { Story, StoryRound } from '@/types'
import RoundCard from '@/components/RoundCard.vue'
import OpeningPanel from '@/components/OpeningPanel.vue'

const store = useStoryStore()

const editValues = reactive({ next_scene: '', next_narration: '' })
const autoAdvanceTimer = ref<number | null>(null)

const reversedRounds = computed(() =>
  [...(store.selectedItem?.round || [])].reverse()
)

const totalChars = computed(() => {
  const rounds = store.selectedItem?.round || []
  return rounds.reduce((count, round) => {
    return count +
      (round.scene || '').length +
      (round.narration || '').length +
      (round.next_scene || '').length +
      (round.next_narration || '').length +
      (round.role1_action || '').length +
      (round.role1_dialogue || '').length +
      (round.role2_action || '').length +
      (round.role2_dialogue || '').length
  }, 0)
})

const role1Name = computed(() => (store.selectedItem?.role1?.name as string) || '角色 1')
const role2Name = computed(() => (store.selectedItem?.role2?.name as string) || '角色 2')

const lastScene = computed(() => {
  if (!store.selectedItem) return '选择故事后开始阅读'
  const rounds = store.selectedItem.round || []
  const latest = [...rounds].reverse().find(r => r.next_scene || r.scene)
  return (latest?.next_scene || latest?.scene || store.selectedItem.initial_scene || '尚未设置场景') as string
})

function canReadStory(story: Story): boolean {
  return Boolean(story.role1?.name && story.role2?.name)
}

store.fetchAll()

function handleSelectStory(story: Story) {
  store.select(story.id)
  if (!canReadStory(story)) {
    ElMessage.warning('阅读必须包含两个角色，请先到故事管理里设置角色 1 和角色 2。')
  }
}

async function handleGenerateRound() {
  if (!store.selectedItem || store.generating) return
  if (!store.hasOpening) {
    store.openingDraft = { scene: '', narration: '', first: 'role1' }
    return
  }
  try {
    await store.generateRound(store.selectedItem.id)
  } catch {
    ElMessage.error('生成失败')
  }
}

function toggleAutoAdvance() {
  store.setAutoAdvance(!store.autoAdvanceEnabled)
}

function handleStartEdit(round: StoryRound) {
  store.startEditRound(round.id)
  editValues.next_scene = round.next_scene || ''
  editValues.next_narration = round.next_narration || ''
}

function handleCancelEdit() {
  store.cancelEdit()
}

async function handleSaveEdit(roundId: number) {
  if (!store.selectedItem) return
  try {
    await store.updateRound(store.selectedItem.id, roundId, {
      next_scene: editValues.next_scene,
      next_narration: editValues.next_narration,
    })
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
}

function handleEditChange(field: 'next_scene' | 'next_narration', value: string) {
  editValues[field] = value
}

function scheduleAutoAdvance() {
  if (autoAdvanceTimer.value) {
    clearTimeout(autoAdvanceTimer.value)
    autoAdvanceTimer.value = null
  }
  if (!store.autoAdvanceEnabled || !store.hasOpening || store.generating) return
  autoAdvanceTimer.value = window.setTimeout(() => {
    handleGenerateRound()
  }, store.autoAdvanceDelay * 1000)
}

watch(() => [store.autoAdvanceEnabled, store.autoAdvanceDelay, store.hasOpening, store.generating], () => {
  scheduleAutoAdvance()
})

watch(() => store.selectedItem?.round?.length, () => {
  if (store.autoAdvanceEnabled && store.hasOpening && !store.generating) {
    scheduleAutoAdvance()
  }
})

onMounted(() => {
  scheduleAutoAdvance()
})

onUnmounted(() => {
  if (autoAdvanceTimer.value) {
    clearTimeout(autoAdvanceTimer.value)
  }
})
</script>

<style scoped>
.read-layout {
  display: flex;
  height: 100vh;
  gap: 0;
}

.list-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.list-title {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.list-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.list-panel :deep(.el-scrollbar__wrap) {
  padding: 12px;
}

.list-item {
  padding: 12px;
  border-radius: 0;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.list-item:hover {
  background: var(--el-fill-color-light);
}

.list-item.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.item-content {
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.item-round {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.item-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 4px 0 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.content-panel {
  flex: 1;
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-fill-color-lighter);
}

.content-title {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.content-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.content-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.delay-input {
  width: 80px;
}

.delay-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.content-body {
  padding: 20px;
  max-width: 950px;
  width: 100%;
}

.current-scene {
  background: var(--el-fill-color-light);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.scene-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-primary);
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.scene-text {
  font-size: 15px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  margin: 0;
  white-space: pre-wrap;
}

/* 输入框字体优化 */
:deep(.el-textarea__inner),
:deep(.el-input__inner) {
  font-size: 15px;
}

:deep(.el-textarea__inner) {
  line-height: 1.8;
}
</style>
