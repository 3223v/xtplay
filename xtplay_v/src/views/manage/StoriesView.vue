<template>
  <crud-layout
    title="故事管理"
    :items="store.items"
    :selected-id="store.selectedId"
    :searchable="true"
    search-placeholder="搜索故事..."
    empty-text="暂无故事"
    @select="handleSelect"
    @create="handleCreate"
    @delete="handleDelete"
  >
    <template #edit>
      <edit-panel
        v-if="store.selectedItem"
        :title="store.selectedItem.title || '未命名故事'"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="saving"
        :import-export-data="store.selectedItem"
        entity-name="story"
        @save="handleSave"
        @import="handleImport"
        @cancel="handleCancel"
      >
        <div class="edit-form">
          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">标题</label>
                <input v-model="formData.title" class="form-input" placeholder="故事标题" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">状态</label>
                <div class="radio-group">
                  <label class="radio-pill" :class="{ active: formData.status === 'active' }">
                    <input type="radio" v-model="formData.status" value="active" class="radio-hidden" />
                    进行中
                  </label>
                  <label class="radio-pill" :class="{ active: formData.status === 'completed' }">
                    <input type="radio" v-model="formData.status" value="completed" class="radio-hidden" />
                    已完成
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="formData.description" class="form-textarea" rows="2" placeholder="故事描述" />
          </div>

          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">API Key</label>
                <input v-model="formData.api_key" class="form-input" placeholder="API Key" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">模型</label>
                <input v-model="formData.model" class="form-input" placeholder="模型名称" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">标签</label>
            <input v-model="tagsInput" class="form-input" placeholder="标签1, 标签2" />
          </div>

          <div class="form-group">
            <label class="form-label">初始场景</label>
            <textarea v-model="formData.initial_scene" class="form-textarea" rows="2" placeholder="故事的初始场景描述" />
          </div>

          <div class="form-divider">预设</div>
          <div class="role-section">
            <div class="form-row">
              <div class="form-col">
                <div class="form-group">
                  <label class="form-label">从现有预设导入</label>
                  <select v-model="selectedPresetId" class="form-select" @change="handleSelectPreset">
                    <option :value="null">选择预设导入</option>
                    <option v-for="preset in presetStore.items" :key="preset.id" :value="preset.id">
                      {{ preset.id }} - Temperature: {{ preset.temperature }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-col-actions">
                <button class="btn-ghost btn-sm" @click="clearPreset">清空预设</button>
              </div>
            </div>
            <div v-if="formData.preset" class="descriptions-grid">
              <div class="descriptions-item">
                <span class="descriptions-label">Temperature</span>
                <span class="descriptions-value">{{ formData.preset.temperature }}</span>
              </div>
              <div class="descriptions-item">
                <span class="descriptions-label">Top P</span>
                <span class="descriptions-value">{{ formData.preset.top_p }}</span>
              </div>
              <div class="descriptions-item">
                <span class="descriptions-label">Frequency Penalty</span>
                <span class="descriptions-value">{{ formData.preset.frequency_penalty }}</span>
              </div>
              <div class="descriptions-item">
                <span class="descriptions-label">Presence Penalty</span>
                <span class="descriptions-value">{{ formData.preset.presence_penalty }}</span>
              </div>
            </div>
          </div>

          <div class="form-divider">世界书</div>
          <div class="role-section">
            <div class="form-row">
              <div class="form-col">
                <div class="form-group">
                  <label class="form-label">从现有世界书导入</label>
                  <select v-model="selectedLorebookId" class="form-select" @change="handleSelectLorebook">
                    <option :value="null">选择世界书导入</option>
                    <option v-for="lorebook in lorebookStore.items" :key="lorebook.id" :value="lorebook.id">
                      {{ lorebook.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-col-actions">
                <button class="btn-ghost btn-sm" @click="clearLorebook">清空世界书</button>
              </div>
            </div>
            <div v-if="formData.lorebook" class="descriptions-grid">
              <div class="descriptions-item">
                <span class="descriptions-label">名称</span>
                <span class="descriptions-value">{{ formData.lorebook.name }}</span>
              </div>
              <div class="descriptions-item">
                <span class="descriptions-label">条目数</span>
                <span class="descriptions-value">{{ Object.keys(formData.lorebook.entries || {}).length }}</span>
              </div>
              <div class="descriptions-item" style="grid-column: 1 / -1;">
                <span class="descriptions-label">描述</span>
                <span class="descriptions-value">{{ formData.lorebook.description }}</span>
              </div>
            </div>
          </div>

          <div class="form-divider">角色 1</div>
          <div class="role-section">
            <div class="form-row">
              <div class="form-col">
                <div class="form-group">
                  <label class="form-label">从现有角色导入</label>
                  <select v-model="importRole1Id" class="form-select" @change="handleImportRole1(importRole1Id)">
                    <option :value="null">选择角色导入</option>
                    <option v-for="role in roleStore.items" :key="role.id" :value="role.id">
                      {{ role.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-col-actions">
                <button class="btn-ghost btn-sm" @click="clearRole1">清空角色</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">名称</label>
              <input v-model="formData.role1.name" class="form-input" placeholder="角色1名称" />
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea v-model="formData.role1.description" class="form-textarea" rows="2" placeholder="角色1描述" />
            </div>
            <div class="form-group">
              <label class="form-label">性格</label>
              <textarea v-model="formData.role1.personality" class="form-textarea" rows="2" placeholder="角色1性格" />
            </div>
            <div class="form-group">
              <label class="form-label">首消息</label>
              <textarea v-model="formData.role1.first_mes" class="form-textarea" rows="2" placeholder="角色1首消息" />
            </div>
            <div class="form-group">
              <label class="form-label">消息示例</label>
              <textarea v-model="formData.role1.mes_example" class="form-textarea" rows="2" placeholder="角色1消息示例" />
            </div>
            <div class="form-group">
              <label class="form-label">系统提示</label>
              <textarea v-model="formData.role1.system_prompt" class="form-textarea" rows="2" placeholder="角色1系统提示" />
            </div>
          </div>

          <div class="form-divider">角色 2</div>
          <div class="role-section">
            <div class="form-row">
              <div class="form-col">
                <div class="form-group">
                  <label class="form-label">从现有角色导入</label>
                  <select v-model="importRole2Id" class="form-select" @change="handleImportRole2(importRole2Id)">
                    <option :value="null">选择角色导入</option>
                    <option v-for="role in roleStore.items" :key="role.id" :value="role.id">
                      {{ role.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-col-actions">
                <button class="btn-ghost btn-sm" @click="clearRole2">清空角色</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">名称</label>
              <input v-model="formData.role2.name" class="form-input" placeholder="角色2名称" />
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea v-model="formData.role2.description" class="form-textarea" rows="2" placeholder="角色2描述" />
            </div>
            <div class="form-group">
              <label class="form-label">性格</label>
              <textarea v-model="formData.role2.personality" class="form-textarea" rows="2" placeholder="角色2性格" />
            </div>
            <div class="form-group">
              <label class="form-label">首消息</label>
              <textarea v-model="formData.role2.first_mes" class="form-textarea" rows="2" placeholder="角色2首消息" />
            </div>
            <div class="form-group">
              <label class="form-label">消息示例</label>
              <textarea v-model="formData.role2.mes_example" class="form-textarea" rows="2" placeholder="角色2消息示例" />
            </div>
            <div class="form-group">
              <label class="form-label">系统提示</label>
              <textarea v-model="formData.role2.system_prompt" class="form-textarea" rows="2" placeholder="角色2系统提示" />
            </div>
          </div>
        </div>
      </edit-panel>
      <edit-panel v-else title="选择一个故事" subtitle="从左侧列表选择故事进行编辑">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <p>请选择一个故事</p>
        </div>
      </edit-panel>
    </template>
  </crud-layout>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import CrudLayout from '@/components/CrudLayout.vue'
import EditPanel from '@/components/EditPanel.vue'
import { useStoryStore, useRoleStore, usePresetStore, useLorebookStore } from '@/stores'
import type { Story, Role, Preset, Lorebook } from '@/types'

const store = useStoryStore()
const roleStore = useRoleStore()
const presetStore = usePresetStore()
const lorebookStore = useLorebookStore()
const saving = ref(false)
const tagsInput = ref('')
const importRole1Id = ref<number | null>(null)
const importRole2Id = ref<number | null>(null)
const selectedPresetId = ref<number | null>(null)
const selectedLorebookId = ref<number | null>(null)

const formData = reactive<{
  title: string
  description: string
  status: 'active' | 'completed'
  api_key: string
  model: string
  initial_scene: string
  role1: {
    name: string
    description: string
    personality: string
    first_mes: string
    mes_example: string
    system_prompt: string
  }
  role2: {
    name: string
    description: string
    personality: string
    first_mes: string
    mes_example: string
    system_prompt: string
  }
  preset?: Preset
  lorebook?: Lorebook
}>({
  title: '',
  description: '',
  status: 'active',
  api_key: '',
  model: '',
  initial_scene: '',
  role1: { name: '', description: '', personality: '', first_mes: '', mes_example: '', system_prompt: '' },
  role2: { name: '', description: '', personality: '', first_mes: '', mes_example: '', system_prompt: '' },
})

const lastFormStoryId = ref<number | null>(null)

watch(() => store.selectedItem, (item) => {
  if (!item) {
    lastFormStoryId.value = null
    return
  }
  // 只在实际切换到不同故事时才更新表单，忽略 fetchAll 刷新导致的引用变化
  if (item.id === lastFormStoryId.value) return
  lastFormStoryId.value = item.id

  Object.assign(formData, {
    title: item.title,
    description: item.description,
    status: item.status as 'active' | 'completed',
    api_key: item.api_key || '',
    model: item.model || '',
    initial_scene: item.initial_scene || '',
    role1: {
      name: (item.role1?.name as string) || '',
      description: (item.role1?.description as string) || '',
      personality: (item.role1?.personality as string) || '',
      first_mes: (item.role1?.first_mes as string) || '',
      mes_example: (item.role1?.mes_example as string) || '',
      system_prompt: (item.role1?.system_prompt as string) || '',
    },
    role2: {
      name: (item.role2?.name as string) || '',
      description: (item.role2?.description as string) || '',
      personality: (item.role2?.personality as string) || '',
      first_mes: (item.role2?.first_mes as string) || '',
      mes_example: (item.role2?.mes_example as string) || '',
      system_prompt: (item.role2?.system_prompt as string) || '',
    },
    preset: item.preset,
    lorebook: item.lorebook,
  })
  tagsInput.value = (item.tags || []).join(', ')
  selectedPresetId.value = item.preset?.id || null
  selectedLorebookId.value = item.lorebook?.id || null
}, { immediate: true })

onMounted(() => {
  store.fetchAll()
  roleStore.fetchAll()
  presetStore.fetchAll()
  lorebookStore.fetchAll()
})

function handleSelect(id: number) {
  store.select(id)
}

async function handleCreate() {
  try {
    const created = await store.create({ title: '新故事', status: 'active' })
    store.select(created.id)
    ElMessage.success('创建成功')
  } catch {
    ElMessage.error('创建失败')
  }
}

async function handleDelete(id: number) {
  try {
    await store.remove(id)
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handleSave() {
  if (!store.selectedItem) return
  saving.value = true
  try {
    const tags = tagsInput.value.split(',').map(s => s.trim()).filter(Boolean)
    await store.update(store.selectedItem.id, {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      api_key: formData.api_key,
      model: formData.model,
      tags,
      initial_scene: formData.initial_scene,
      role1: formData.role1,
      role2: formData.role2,
      preset: formData.preset,
      lorebook: formData.lorebook,
    } as Partial<Story>)
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function handleSelectPreset(id: number | null) {
  if (!id) {
    formData.preset = undefined
    return
  }
  const preset = presetStore.items.find(p => p.id === id)
  if (preset) {
    formData.preset = preset
  }
}

function handleSelectLorebook(id: number | null) {
  if (!id) {
    formData.lorebook = undefined
    return
  }
  const lorebook = lorebookStore.items.find(l => l.id === id)
  if (lorebook) {
    formData.lorebook = lorebook
  }
}

function clearPreset() {
  formData.preset = undefined
  selectedPresetId.value = null
}

function clearLorebook() {
  formData.lorebook = undefined
  selectedLorebookId.value = null
}

function handleCancel() {
  store.select(null)
}

function handleImportRole1(id: number | null) {
  if (!id) return
  const role = roleStore.items.find(r => r.id === id)
  if (role) {
    copyRoleToForm(role, formData.role1)
  }
}

function handleImportRole2(id: number | null) {
  if (!id) return
  const role = roleStore.items.find(r => r.id === id)
  if (role) {
    copyRoleToForm(role, formData.role2)
  }
}

function copyRoleToForm(role: Role, target: typeof formData.role1) {
  target.name = role.name
  target.description = role.description
  target.personality = role.personality
  target.first_mes = role.first_mes
  target.mes_example = role.mes_example
  target.system_prompt = role.system_prompt
}

function clearRole1() {
  formData.role1 = { name: '', description: '', personality: '', first_mes: '', mes_example: '', system_prompt: '' }
  importRole1Id.value = null
}

function clearRole2() {
  formData.role2 = { name: '', description: '', personality: '', first_mes: '', mes_example: '', system_prompt: '' }
  importRole2Id.value = null
}

async function handleImport(data: unknown) {
  try {
    const created = await store.create(data as Partial<Story>)
    store.select(created.id)
    ElMessage.success('导入成功')
  } catch { ElMessage.error('导入失败') }
}
</script>

<style scoped>
.edit-form {
  max-width: 750px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: var(--text-tertiary);
}

.empty-state svg { margin-bottom: 12px; opacity: 0.3; }
.empty-state p { font-size: var(--font-sm); margin: 0; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.form-col { min-width: 0; }
.form-col-actions { display: flex; align-items: flex-end; padding-bottom: 20px; }
.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: var(--font-sm); font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-input:focus { border-color: var(--primary-light); }
.form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); line-height: var(--leading-relaxed); color: var(--text-primary); resize: vertical; outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-textarea:focus { border-color: var(--primary-light); }
.form-divider { font-size: var(--font-sm); font-weight: 600; color: var(--text-secondary); padding: 16px 0 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
.form-select { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; background: var(--bg-card); cursor: pointer; }
.form-select:focus { border-color: var(--primary-light); }

.radio-group { display: flex; gap: 8px; }
.radio-hidden { display: none; }
.radio-pill { padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: var(--font-sm); color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans); }
.radio-pill:hover { border-color: var(--primary-light); color: var(--primary); }
.radio-pill.active { background: var(--primary); border-color: var(--primary); color: white; }

.role-section { background: var(--bg-main); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px; }

.descriptions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.descriptions-item { display: flex; flex-direction: column; background: var(--bg-card); border-radius: var(--radius-sm); padding: 8px 12px; border: 1px solid var(--border); }
.descriptions-label { font-size: var(--font-xs); color: var(--text-tertiary); margin-bottom: 2px; }
.descriptions-value { font-size: var(--font-sm); color: var(--text-primary); font-weight: 500; }

.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: var(--font-sm); font-weight: 500; cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans); }
.btn-ghost:hover { border-color: var(--primary-light); color: var(--primary); }
.btn-sm { padding: 6px 12px; font-size: var(--font-xs); }
</style>
