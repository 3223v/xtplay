<template>
  <crud-layout
    title="预设管理"
    :items="store.items"
    :selected-id="store.selectedId"
    empty-text="暂无预设"
    @select="handleSelect"
    @create="handleCreate"
    @delete="handleDelete"
  >
    <template #edit>
      <edit-panel
        v-if="store.selectedItem"
        title="编辑预设"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="store.loading"
        :import-export-data="store.selectedItem"
        entity-name="preset"
        @save="handleSave"
        @import="handleImport"
      >
        <div class="edit-form">
          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">温度 (Temperature)</label>
                <input v-model.number="formData.temperature" type="number" step="0.1" min="0" max="2" class="form-input" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">频率惩罚</label>
                <input v-model.number="formData.frequency_penalty" type="number" step="0.1" min="0" max="2" class="form-input" />
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">存在惩罚</label>
                <input v-model.number="formData.presence_penalty" type="number" step="0.1" min="0" max="2" class="form-input" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">Top P</label>
                <input v-model.number="formData.top_p" type="number" step="0.05" min="0" max="1" class="form-input" />
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">Top K</label>
                <input v-model.number="formData.top_k" type="number" min="1" max="100" class="form-input" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">重复惩罚</label>
                <input v-model.number="formData.repetition_penalty" type="number" step="0.1" min="1" max="2" class="form-input" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">主提示词</label>
            <textarea v-model="formData.main_prompt" class="form-textarea" rows="3" placeholder="主提示词" />
          </div>
          <div class="form-group">
            <label class="form-label">扮演提示词</label>
            <textarea v-model="formData.impersonation_prompt" class="form-textarea" rows="2" placeholder="扮演提示词" />
          </div>
          <div class="form-group">
            <label class="form-label">助手预填</label>
            <textarea v-model="formData.assistant_prefill" class="form-textarea" rows="2" placeholder="助手预填" />
          </div>
          <div class="form-group">
            <label class="form-label">补充提示词</label>
            <textarea v-model="formData.jailbreak_prompt" class="form-textarea" rows="2" placeholder="补充提示词" />
          </div>
        </div>
      </edit-panel>
      <edit-panel v-else title="选择一个预设" subtitle="从左侧列表选择预设进行编辑">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          <p>请选择一个预设</p>
        </div>
      </edit-panel>
    </template>
  </crud-layout>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CrudLayout from '@/components/CrudLayout.vue'
import EditPanel from '@/components/EditPanel.vue'
import { usePresetStore } from '@/stores'
import type { Preset } from '@/types'

const store = usePresetStore()

const formData = reactive<Partial<Preset>>({
  temperature: 0.75,
  frequency_penalty: 0.8,
  presence_penalty: 0.8,
  top_p: 0.99,
  top_k: 75,
  top_a: 0,
  min_p: 0.1,
  repetition_penalty: 1.1,
  names_in_completion: true,
  main_prompt: '',
  impersonation_prompt: '',
  assistant_prefill: '',
  jailbreak_prompt: '',
})

watch(() => store.selectedItem, (item) => {
  if (item) Object.assign(formData, { ...item })
}, { immediate: true })

store.fetchAll()

function handleSelect(id: number) { store.select(id) }

async function handleCreate() {
  try {
    const created = await store.create({ temperature: 0.75 })
    store.select(created.id)
    ElMessage.success('创建成功')
  } catch { ElMessage.error('创建失败') }
}

async function handleDelete(id: number) {
  try { await store.remove(id); ElMessage.success('删除成功') }
  catch { ElMessage.error('删除失败') }
}

async function handleSave() {
  if (!store.selectedItem) return
  try { await store.update(store.selectedItem.id, formData); ElMessage.success('保存成功') }
  catch { ElMessage.error('保存失败') }
}

async function handleImport(data: unknown) {
  try {
    const created = await store.create(data as Partial<Preset>)
    store.select(created.id)
    ElMessage.success('导入成功')
  } catch { ElMessage.error('导入失败') }
}
</script>

<style scoped>
.edit-form { max-width: 600px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: var(--text-tertiary); }
.empty-state svg { margin-bottom: 12px; opacity: 0.3; }
.empty-state p { font-size: var(--font-sm); margin: 0; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.form-col { min-width: 0; }
.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: var(--font-sm); font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-input:focus { border-color: var(--primary-light); }
.form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); line-height: var(--leading-relaxed); color: var(--text-primary); resize: vertical; outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-textarea:focus { border-color: var(--primary-light); }
</style>
