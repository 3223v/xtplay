<template>
  <div class="edit-panel-content">
    <div v-if="title" class="edit-header">
      <h3 class="edit-title">{{ title }}</h3>
      <p v-if="subtitle" class="edit-subtitle">{{ subtitle }}</p>
      <div class="edit-actions">
        <el-button v-if="showCancel" size="small" @click="$emit('cancel')">取消</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="$emit('save')">
          保存
        </el-button>
      </div>
    </div>
    <div class="edit-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  saving?: boolean
  showCancel?: boolean
}>()

defineEmits<{
  save: []
  cancel: []
}>()
</script>

<style scoped>
.edit-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-fill-color-lighter);
}

.edit-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.edit-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 4px 0 0 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.edit-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}
</style>
