<template>
  <div class="tag-list">
    <div class="tag-input-wrapper">
      <el-input
        v-model="newTag"
        placeholder="输入后按回车添加"
        size="small"
        @keyup.enter="addTag"
        class="tag-input"
      />
    </div>
    <div class="tags-container">
      <el-tag
        v-for="(tag, index) in modelValue"
        :key="index"
        closable
        @close="removeTag(index)"
        class="tag-item"
      >
        {{ tag }}
      </el-tag>
      <div v-if="modelValue.length === 0" class="empty-tip">
        暂无标签，按回车添加
      </div>
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

.tag-input-wrapper {
  margin-bottom: 8px;
}

.tag-input {
  width: 100%;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.tag-item {
  margin-bottom: 0;
}

.empty-tip {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  line-height: 32px;
}
</style>
