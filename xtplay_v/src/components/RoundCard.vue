<template>
  <div class="round-card" :class="{ 'is-first': isFirst }">
    <div class="round-meta">
      <span class="round-badge">第 {{ roundIndex }} 轮</span>
      <span v-if="isFirst" class="round-new">最新</span>
    </div>

    <!-- 场景 & 旁白 -->
    <div v-if="round.scene || round.narration" class="round-scene">
      <div v-if="round.scene" class="scene-line">
        <span class="scene-label">场景</span>
        <p class="scene-text">{{ round.scene }}</p>
      </div>
      <div v-if="round.narration" class="narration-text">
        <p>{{ round.narration }}</p>
      </div>
    </div>

    <!-- 对话气泡 -->
    <div class="dialogue-flow">
      <div
        v-for="entry in dialogueEntries"
        :key="entry.role"
        class="dialogue-bubble"
        :class="entry.side"
      >
        <div class="bubble-avatar">{{ entry.initial }}</div>
        <div class="bubble-content">
          <div class="bubble-name">{{ entry.name }}</div>
          <p v-if="entry.action" class="bubble-action">{{ entry.action }}</p>
          <div v-if="entry.dialogue" class="bubble-dialogue-row">
            <p class="bubble-dialogue">{{ entry.dialogue }}</p>
            <TtsButton :text="entry.dialogue" :role="entry.role" :side="entry.side" />
          </div>
        </div>
      </div>
    </div>

    <!-- 下一轮编辑 -->
    <div v-if="hasNextScene" class="next-section">
      <div class="next-header">
        <span class="next-label">下一轮</span>
        <button v-if="!isEditing" class="text-btn" @click="$emit('startEdit')">编辑</button>
      </div>

      <template v-if="isEditing">
        <textarea
          :value="editValues.next_scene"
          @input="$emit('editChange', 'next_scene', ($event.target as HTMLTextAreaElement).value)"
          class="next-input"
          placeholder="下一轮场景"
          rows="2"
        />
        <textarea
          :value="editValues.next_narration"
          @input="$emit('editChange', 'next_narration', ($event.target as HTMLTextAreaElement).value)"
          class="next-input"
          placeholder="下一轮旁白"
          rows="2"
          style="margin-top: 8px"
        />
        <div class="next-actions">
          <button class="btn-ghost btn-sm" @click="$emit('cancelEdit')">取消</button>
          <button class="btn-primary btn-sm" :disabled="saving" @click="$emit('saveEdit')">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </template>

      <template v-else>
        <p v-if="round.next_scene" class="next-text">{{ round.next_scene }}</p>
        <p v-if="round.next_narration" class="next-narration">{{ round.next_narration }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StoryRound } from '@/types'
import TtsButton from '@/components/TtsButton.vue'

const props = defineProps<{
  round: StoryRound
  roundIndex: number
  role1Name: string
  role2Name: string
  isFirst: boolean
  isEditing: boolean
  editValues: { next_scene: string; next_narration: string }
  saving: boolean
}>()

defineEmits<{
  startEdit: []
  cancelEdit: []
  saveEdit: []
  editChange: [field: 'next_scene' | 'next_narration', value: string]
}>()

const firstRole = computed(() => props.round.first === 'role2' ? 'role2' : 'role1')
const secondRole = computed(() => firstRole.value === 'role1' ? 'role2' : 'role1')

const role1Initial = computed(() => props.role1Name.trim().charAt(0).toUpperCase() || '?')
const role2Initial = computed(() => props.role2Name.trim().charAt(0).toUpperCase() || '?')

const hasNextScene = computed(() => props.isEditing || props.round.next_scene || props.round.next_narration)

const dialogueEntries = computed(() => {
  const entries: Array<{
    role: string
    side: 'left' | 'right'
    name: string
    initial: string
    action: string
    dialogue: string
  }> = []

  const firstKey = firstRole.value
  const secondKey = secondRole.value

  for (const key of [firstKey, secondKey]) {
    const action = String(props.round[`${key}_action` as keyof StoryRound] || '')
    const dialogue = String(props.round[`${key}_dialogue` as keyof StoryRound] || '')
    if (action || dialogue) {
      entries.push({
        role: key,
        side: firstKey === key ? 'left' : 'right',
        name: key === 'role1' ? props.role1Name : props.role2Name,
        initial: key === 'role1' ? role1Initial.value : role2Initial.value,
        action,
        dialogue,
      })
    }
  }

  return entries
})
</script>

<style scoped>
.round-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  transition: all var(--transition-base);
}

.round-card.is-first {
  border-color: var(--primary-light);
  box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.1), var(--shadow-md);
}

.round-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.round-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  background: var(--bg-main);
  color: var(--text-secondary);
  border-radius: 20px;
  font-size: var(--font-xs);
  font-weight: 500;
}

.round-new {
  font-size: var(--font-xs);
  color: var(--primary);
  font-weight: 500;
}

/* 场景 */
.round-scene {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}

.scene-line {
  margin-bottom: 8px;
}

.scene-label {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.scene-text {
  font-size: var(--font-base);
  line-height: var(--leading-relaxed);
  color: var(--text-primary);
  margin: 0;
}

.narration-text {
  font-style: italic;
  font-size: var(--font-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  padding-left: 12px;
  border-left: 3px solid var(--border);
}

.narration-text p {
  margin: 0;
}

/* 对话气泡 */
.dialogue-flow {
  margin-bottom: 16px;
}

.dialogue-bubble {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.dialogue-bubble.left {
  flex-direction: row;
}

.dialogue-bubble.right {
  flex-direction: row-reverse;
}

.bubble-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-sm);
  font-weight: 700;
  flex-shrink: 0;
}

.dialogue-bubble.left .bubble-avatar {
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: white;
}

.dialogue-bubble.right .bubble-avatar {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
}

.bubble-content {
  max-width: 80%;
}

.dialogue-bubble.left .bubble-content {
  text-align: left;
}

.dialogue-bubble.right .bubble-content {
  text-align: right;
}

.bubble-name {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.bubble-action {
  font-size: var(--font-sm);
  font-style: italic;
  color: var(--text-secondary);
  margin: 0 0 4px;
  line-height: var(--leading-relaxed);
}

.bubble-dialogue-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.bubble-dialogue {
  display: inline;
  font-size: var(--font-base);
  color: var(--text-primary);
  margin: 0;
  line-height: var(--leading-relaxed);
  background: var(--bg-main);
  padding: 8px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
}

.dialogue-bubble.left .bubble-dialogue {
  border-top-left-radius: 4px;
}

.dialogue-bubble.right .bubble-dialogue {
  border-top-right-radius: 4px;
}

/* 下一轮编辑 */
.next-section {
  background: var(--bg-main);
  border-radius: var(--radius-md);
  padding: 16px;
}

.next-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.next-label {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.text-btn {
  border: none;
  background: transparent;
  color: var(--primary);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.text-btn:hover {
  background: var(--primary-bg);
}

.next-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--font-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-primary);
  background: var(--bg-card);
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.next-input:focus {
  border-color: var(--primary-light);
}

.next-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.next-text {
  font-size: var(--font-sm);
  color: var(--text-primary);
  margin: 0;
  line-height: var(--leading-relaxed);
}

.next-narration {
  font-size: var(--font-sm);
  font-style: italic;
  color: var(--text-secondary);
  margin: 4px 0 0;
  line-height: var(--leading-relaxed);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-light);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
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
}

.btn-ghost:hover {
  background: var(--bg-card);
}

.btn-sm {
  padding: 5px 12px;
  font-size: var(--font-xs);
}
</style>
