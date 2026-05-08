<template>
  <article class="round-card" :class="{ 'is-first': isFirst }">
    <div class="round-header">
      <el-tag size="small" :type="isFirst ? 'primary' : 'info'">#{{ round.id }}</el-tag>
      <span v-if="isFirst" class="round-new">最新</span>
    </div>

    <div class="round-scene" v-if="round.scene || round.narration">
      <div class="scene-block" v-if="round.scene">
        <span class="block-label">场景</span>
        <p class="block-text">{{ round.scene }}</p>
      </div>
      <div class="narration-block" v-if="round.narration">
        <p class="block-text narration">{{ round.narration }}</p>
      </div>
    </div>

    <div class="dialogue-section">
      <div class="dialogue-item left" v-if="firstRole === 'role1'">
        <div class="avatar">{{ role1Initial }}</div>
        <div class="dialogue-content">
          <span class="role-name">{{ role1Name }}</span>
          <p class="action-text" v-if="round.role1_action">{{ round.role1_action }}</p>
          <p class="dialogue-text" v-if="round.role1_dialogue">"{{ round.role1_dialogue }}"</p>
        </div>
      </div>
      <div class="dialogue-item right" v-if="secondRole === 'role1'">
        <div class="dialogue-content">
          <span class="role-name">{{ role1Name }}</span>
          <p class="action-text" v-if="round.role1_action">{{ round.role1_action }}</p>
          <p class="dialogue-text" v-if="round.role1_dialogue">"{{ round.role1_dialogue }}"</p>
        </div>
        <div class="avatar">{{ role1Initial }}</div>
      </div>

      <div class="dialogue-item left" v-if="firstRole === 'role2'">
        <div class="avatar">{{ role2Initial }}</div>
        <div class="dialogue-content">
          <span class="role-name">{{ role2Name }}</span>
          <p class="action-text" v-if="round.role2_action">{{ round.role2_action }}</p>
          <p class="dialogue-text" v-if="round.role2_dialogue">"{{ round.role2_dialogue }}"</p>
        </div>
      </div>
      <div class="dialogue-item right" v-if="secondRole === 'role2'">
        <div class="dialogue-content">
          <span class="role-name">{{ role2Name }}</span>
          <p class="action-text" v-if="round.role2_action">{{ round.role2_action }}</p>
          <p class="dialogue-text" v-if="round.role2_dialogue">"{{ round.role2_dialogue }}"</p>
        </div>
        <div class="avatar">{{ role2Initial }}</div>
      </div>
    </div>

    <div class="next-scene-section" v-if="isEditing || round.next_scene || round.next_narration">
      <div class="section-header">
        <span class="section-title">下一轮</span>
        <el-button v-if="!isEditing" size="small" text @click="$emit('startEdit')">编辑</el-button>
      </div>
      <template v-if="isEditing">
        <el-input
          :model-value="editValues.next_scene"
          @update:model-value="$emit('editChange', 'next_scene', $event)"
          type="textarea"
          :rows="2"
          placeholder="下一轮场景"
        />
        <el-input
          :model-value="editValues.next_narration"
          @update:model-value="$emit('editChange', 'next_narration', $event)"
          type="textarea"
          :rows="2"
          placeholder="下一轮旁白"
          class="mt-2"
        />
        <div class="edit-actions">
          <el-button size="small" @click="$emit('cancelEdit')">取消</el-button>
          <el-button type="primary" size="small" :loading="saving" @click="$emit('saveEdit')">保存</el-button>
        </div>
      </template>
      <template v-else>
        <p v-if="round.next_scene" class="block-text">{{ round.next_scene }}</p>
        <p v-if="round.next_narration" class="block-text narration">{{ round.next_narration }}</p>
      </template>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StoryRound } from '@/types'

const props = defineProps<{
  round: StoryRound
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

const firstRole = computed(() => (props.round.first === 'role2' ? 'role2' : 'role1'))
const secondRole = computed(() => (firstRole.value === 'role1' ? 'role2' : 'role1'))

const role1Initial = computed(() => props.role1Name.trim().charAt(0) || '?')
const role2Initial = computed(() => props.role2Name.trim().charAt(0) || '?')
</script>

<style scoped>
.round-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.round-card.is-first {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.round-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.round-new {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.round-scene {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.scene-block,
.narration-block {
  margin-bottom: 8px;
}

.block-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--el-color-primary);
  text-transform: uppercase;
  margin-bottom: 4px;
  display: block;
}

.block-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-primary);
  margin: 0;
}

.block-text.narration {
  font-style: italic;
  color: var(--el-text-color-secondary);
}

.dialogue-section {
  margin-bottom: 16px;
}

.dialogue-item {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.dialogue-item.left {
  flex-direction: row;
}

.dialogue-item.right {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.dialogue-content {
  flex: 1;
  min-width: 0;
}

.role-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  display: block;
  margin-bottom: 4px;
}

.action-text {
  font-size: 13px;
  font-style: italic;
  color: var(--el-text-color-secondary);
  margin: 0 0 4px 0;
}

.dialogue-text {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin: 0;
}

.next-scene-section {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.mt-2 {
  margin-top: 8px;
}
</style>
