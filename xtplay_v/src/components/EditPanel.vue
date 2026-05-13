<template>
  <div class="edit-panel-content">
    <div v-if="title" class="edit-header">
      <div class="edit-header-left">
        <h3 class="edit-title">{{ title }}</h3>
        <p v-if="subtitle" class="edit-subtitle">{{ subtitle }}</p>
      </div>
      <div class="edit-actions">
        <import-export-menu
          v-if="importExportData"
          :data="importExportData"
          :entity-name="entityName"
          @import="(data: unknown) => $emit('import', data)"
        />
        <button v-if="showCancel" class="btn-ghost btn-sm" @click="$emit('cancel')">取消</button>
        <button class="btn-primary btn-sm" :disabled="saving" @click="$emit('save')">
          <svg v-if="saving" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
    <div class="edit-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import ImportExportMenu from '@/components/ImportExportMenu.vue'

defineProps<{
  title?: string
  subtitle?: string
  saving?: boolean
  showCancel?: boolean
  importExportData?: unknown
  entityName?: string
}>()

defineEmits<{
  save: []
  cancel: []
  import: [data: unknown]
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
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.edit-header-left {
  min-width: 0;
}

.edit-title {
  font-size: var(--font-base);
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.edit-subtitle {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin: 2px 0 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
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
  background: var(--bg-main);
}

.btn-sm {
  padding: 5px 12px;
  font-size: var(--font-xs);
}

.edit-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
