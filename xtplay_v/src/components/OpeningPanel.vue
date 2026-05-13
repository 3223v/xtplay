<template>
  <div class="opening-panel">
    <div class="panel-header">
      <div>
        <h3 class="panel-title">开场设定</h3>
        <p class="panel-subtitle">设置故事的开场场景与旁白</p>
      </div>
      <button class="btn-outline btn-sm" :disabled="store.creatingOpening" @click="handleGenerate">
        <svg v-if="store.creatingOpening" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><polyline points="17 8 17 12"/><line x1="13" y1="10" x2="21" y2="10"/></svg>
        {{ store.creatingOpening ? '生成中...' : 'AI 生成' }}
      </button>
    </div>

    <div class="panel-form">
      <div class="form-group">
        <label class="form-label">初始场景</label>
        <textarea
          v-model="localDraft.scene"
          class="form-textarea"
          placeholder="例如：雨夜的旧车站、停摆的时钟、两人第一次重逢的站台..."
          rows="3"
        />
      </div>

      <div class="form-group">
        <label class="form-label">初始旁白</label>
        <textarea
          v-model="localDraft.narration"
          class="form-textarea"
          placeholder="写给读者看的开场旁白，负责氛围、环境和进入故事的钩子。"
          rows="4"
        />
      </div>

      <div class="form-group">
        <label class="form-label">第一位行动角色</label>
        <div class="radio-group">
          <label class="radio-item" :class="{ active: localDraft.first === 'role1' }">
            <input type="radio" v-model="localDraft.first" value="role1" />
            <span>{{ role1Name }}</span>
          </label>
          <label class="radio-item" :class="{ active: localDraft.first === 'role2' }">
            <input type="radio" v-model="localDraft.first" value="role2" />
            <span>{{ role2Name }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <button
        class="btn-primary"
        :disabled="!localDraft.scene.trim() || !localDraft.narration.trim() || store.savingOpening"
        @click="handleSave"
      >
        <svg v-if="store.savingOpening" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 13l4 4L19 7"/></svg>
        {{ store.savingOpening ? '保存中...' : '确认开场' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useSessionStore } from '@/stores'
import type { OpeningDraft } from '@/types'

const props = defineProps<{
  role1Name?: string
  role2Name?: string
  sessionId: number
}>()

const store = useSessionStore()

const localDraft = reactive<OpeningDraft>({
  scene: '',
  narration: '',
  first: 'role1',
})

watch(() => store.openingDraft, (val) => {
  if (val) {
    localDraft.scene = val.scene
    localDraft.narration = val.narration
    localDraft.first = val.first
  }
}, { immediate: true })

const role1Name = props.role1Name || '角色 1'
const role2Name = props.role2Name || '角色 2'

async function handleGenerate() {
  try {
    await store.generateOpening(props.sessionId)
  } catch {
    ElMessage.error('生成开场失败')
  }
}

async function handleSave() {
  try {
    await store.createRound(props.sessionId, {
      scene: localDraft.scene,
      narration: localDraft.narration,
      first: localDraft.first,
      role1_action: '',
      role1_dialogue: '',
      role1_output: '',
      role2_action: '',
      role2_dialogue: '',
      role2_output: '',
    })
    ElMessage.success('开场已保存')
  } catch {
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped>
.opening-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.panel-title {
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.panel-subtitle {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin: 0;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.btn-outline:hover:not(:disabled) {
  border-color: var(--primary-light);
  color: var(--primary);
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 5px 12px;
  font-size: var(--font-xs);
}

.panel-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--font-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-primary);
  background: var(--bg-main);
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.form-textarea:focus {
  border-color: var(--primary-light);
}

.form-textarea::placeholder {
  color: var(--text-tertiary);
}

.radio-group {
  display: flex;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.radio-item:hover {
  border-color: var(--primary-light);
}

.radio-item.active {
  border-color: var(--primary);
  background: var(--primary-bg);
  color: var(--primary);
}

.radio-item input {
  display: none;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
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
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
