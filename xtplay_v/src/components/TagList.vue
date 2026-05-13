<template>
  <div class="tag-list">
    <div class="tag-input-row">
      <input
        v-model="newTag"
        class="tag-input"
        placeholder="输入后按回车添加"
        @keyup.enter="addTag"
      />
    </div>
    <div class="tag-items">
      <span
        v-for="(tag, index) in modelValue"
        :key="index"
        class="tag-pill"
      >
        {{ tag }}
        <button class="tag-remove" @click="removeTag(index)">&times;</button>
      </span>
      <span v-if="modelValue.length === 0" class="tag-empty">暂无标签，按回车添加</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const newTag = ref('')

function addTag() {
  const trimmed = newTag.value.trim()
  if (trimmed && !props.modelValue.includes(trimmed)) {
    emit('update:modelValue', [...props.modelValue, trimmed])
    newTag.value = ''
  }
}

function removeTag(index: number) {
  const newTags = [...props.modelValue]
  newTags.splice(index, 1)
  emit('update:modelValue', newTags)
}
</script>

<style scoped>
.tag-list {
  width: 100%;
}

.tag-input-row {
  margin-bottom: 10px;
}

.tag-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--font-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.tag-input:focus {
  border-color: var(--primary-light);
}

.tag-input::placeholder {
  color: var(--text-tertiary);
}

.tag-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: 20px;
  font-size: var(--font-xs);
  font-weight: 500;
}

.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  font-size: 14px;
  border-radius: 50%;
  padding: 0;
  line-height: 1;
  transition: background var(--transition-fast);
}

.tag-remove:hover {
  background: rgba(79, 70, 229, 0.15);
}

.tag-empty {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  line-height: 32px;
}
</style>
