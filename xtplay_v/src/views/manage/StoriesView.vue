<template>
  <div class="stories-layout">
    <div class="list-panel">
      <div class="list-header">
        <h2 class="list-title">故事管理</h2>
        <el-button type="primary" :icon="Plus" size="small" @click="handleCreate">新建</el-button>
      </div>
      <el-scrollbar height="100%">
        <div
          v-for="item in store.items"
          :key="item.id"
          class="list-item"
          :class="{ active: store.selectedId === item.id }"
          @click="handleSelect(item.id)"
        >
          <div class="item-content">
            <div class="item-title">{{ item.title || '未命名' }}</div>
            <div class="item-meta">
              <el-tag size="small" :type="item.status === 'active' ? 'success' : 'info'">
                {{ item.status === 'active' ? '进行中' : '已完成' }}
              </el-tag>
              <span class="item-round">{{ item.round?.length || 0 }} 轮</span>
            </div>
          </div>
          <el-button
            :icon="Delete"
            circle
            size="small"
            text
            class="delete-btn"
            @click.stop="handleDelete(item.id)"
          />
        </div>
        <el-empty v-if="store.items.length === 0" description="暂无故事" />
      </el-scrollbar>
    </div>
    <div class="edit-panel">
      <template v-if="store.selectedItem">
        <div class="edit-header">
          <div>
            <h3 class="edit-title">{{ store.selectedItem.title || '未命名故事' }}</h3>
            <p class="edit-subtitle">ID: {{ store.selectedItem.id }}</p>
          </div>
          <div class="edit-actions">
            <el-button size="small" @click="handleCancel">取消</el-button>
            <el-button type="primary" size="small" :loading="saving" @click="handleSave">保存</el-button>
          </div>
        </div>
        <el-scrollbar height="calc(100% - 60px)">
          <div class="edit-body">
            <el-form :model="formData" label-position="top">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="标题">
                    <el-input v-model="formData.title" placeholder="故事标题" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="状态">
                    <el-radio-group v-model="formData.status">
                      <el-radio value="active">进行中</el-radio>
                      <el-radio value="completed">已完成</el-radio>
                    </el-radio-group>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="描述">
                <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="故事描述" />
              </el-form-item>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="API Key">
                    <el-input v-model="formData.api_key" placeholder="API Key" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="模型">
                    <el-input v-model="formData.model" placeholder="模型名称" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="标签">
                <el-input v-model="tagsInput" placeholder="标签1, 标签2" />
              </el-form-item>
              <el-form-item label="初始场景">
                <el-input v-model="formData.initial_scene" type="textarea" :rows="2" placeholder="故事的初始场景描述" />
              </el-form-item>

              <el-divider content-position="left">预设</el-divider>
              <div class="role-section">
                <el-row :gutter="20">
                  <el-col :span="16">
                    <el-form-item label="从现有预设导入">
                      <el-select
                        v-model="selectedPresetId"
                        placeholder="选择预设导入"
                        clearable
                        @change="handleSelectPreset"
                      >
                        <el-option
                          v-for="preset in presetStore.items"
                          :key="preset.id"
                          :label="`${preset.id} - Temperature: ${preset.temperature}`"
                          :value="preset.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item>
                      <el-button type="primary" size="small" @click="clearPreset">清空预设</el-button>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-descriptions v-if="formData.preset" :column="2" border size="small">
                  <el-descriptions-item label="Temperature">{{ formData.preset.temperature }}</el-descriptions-item>
                  <el-descriptions-item label="Top P">{{ formData.preset.top_p }}</el-descriptions-item>
                  <el-descriptions-item label="Frequency Penalty">{{ formData.preset.frequency_penalty }}</el-descriptions-item>
                  <el-descriptions-item label="Presence Penalty">{{ formData.preset.presence_penalty }}</el-descriptions-item>
                </el-descriptions>
              </div>

              <el-divider content-position="left">世界书</el-divider>
              <div class="role-section">
                <el-row :gutter="20">
                  <el-col :span="16">
                    <el-form-item label="从现有世界书导入">
                      <el-select
                        v-model="selectedLorebookId"
                        placeholder="选择世界书导入"
                        clearable
                        @change="handleSelectLorebook"
                      >
                        <el-option
                          v-for="lorebook in lorebookStore.items"
                          :key="lorebook.id"
                          :label="lorebook.name"
                          :value="lorebook.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item>
                      <el-button type="primary" size="small" @click="clearLorebook">清空世界书</el-button>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-descriptions v-if="formData.lorebook" :column="2" border size="small">
                  <el-descriptions-item label="名称">{{ formData.lorebook.name }}</el-descriptions-item>
                  <el-descriptions-item label="条目数">{{ Object.keys(formData.lorebook.entries || {}).length }}</el-descriptions-item>
                  <el-descriptions-item label="描述">{{ formData.lorebook.description }}</el-descriptions-item>
                </el-descriptions>
              </div>

              <el-divider content-position="left">角色 1</el-divider>
              <div class="role-section">
                <el-row :gutter="20">
                  <el-col :span="16">
                    <el-form-item label="从现有角色导入">
                      <el-select
                        v-model="importRole1Id"
                        placeholder="选择角色导入"
                        clearable
                        @change="handleImportRole1"
                      >
                        <el-option
                          v-for="role in roleStore.items"
                          :key="role.id"
                          :label="role.name"
                          :value="role.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item>
                      <el-button type="primary" size="small" @click="clearRole1">清空角色</el-button>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="名称">
                  <el-input v-model="formData.role1.name" placeholder="角色1名称" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="formData.role1.description" type="textarea" :rows="2" placeholder="角色1描述" />
                </el-form-item>
                <el-form-item label="性格">
                  <el-input v-model="formData.role1.personality" type="textarea" :rows="2" placeholder="角色1性格" />
                </el-form-item>
                <el-form-item label="首消息">
                  <el-input v-model="formData.role1.first_mes" type="textarea" :rows="2" placeholder="角色1首消息" />
                </el-form-item>
                <el-form-item label="消息示例">
                  <el-input v-model="formData.role1.mes_example" type="textarea" :rows="2" placeholder="角色1消息示例" />
                </el-form-item>
                <el-form-item label="系统提示">
                  <el-input v-model="formData.role1.system_prompt" type="textarea" :rows="2" placeholder="角色1系统提示" />
                </el-form-item>
              </div>

              <el-divider content-position="left">角色 2</el-divider>
              <div class="role-section">
                <el-row :gutter="20">
                  <el-col :span="16">
                    <el-form-item label="从现有角色导入">
                      <el-select
                        v-model="importRole2Id"
                        placeholder="选择角色导入"
                        clearable
                        @change="handleImportRole2"
                      >
                        <el-option
                          v-for="role in roleStore.items"
                          :key="role.id"
                          :label="role.name"
                          :value="role.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item>
                      <el-button type="primary" size="small" @click="clearRole2">清空角色</el-button>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="名称">
                  <el-input v-model="formData.role2.name" placeholder="角色2名称" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="formData.role2.description" type="textarea" :rows="2" placeholder="角色2描述" />
                </el-form-item>
                <el-form-item label="性格">
                  <el-input v-model="formData.role2.personality" type="textarea" :rows="2" placeholder="角色2性格" />
                </el-form-item>
                <el-form-item label="首消息">
                  <el-input v-model="formData.role2.first_mes" type="textarea" :rows="2" placeholder="角色2首消息" />
                </el-form-item>
                <el-form-item label="消息示例">
                  <el-input v-model="formData.role2.mes_example" type="textarea" :rows="2" placeholder="角色2消息示例" />
                </el-form-item>
                <el-form-item label="系统提示">
                  <el-input v-model="formData.role2.system_prompt" type="textarea" :rows="2" placeholder="角色2系统提示" />
                </el-form-item>
              </div>
            </el-form>
          </div>
        </el-scrollbar>
      </template>
      <el-empty v-else description="请选择一个故事" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
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

watch(() => store.selectedItem, (item) => {
  if (item) {
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
  }
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
</script>

<style scoped>
.stories-layout {
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

.list-panel :deep(.el-scrollbar__wrap) {
  padding: 12px;
}

.list-item {
  display: flex;
  align-items: center;
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
  flex: 1;
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

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.list-item:hover .delete-btn {
  opacity: 1;
}

.edit-panel {
  flex: 1;
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.edit-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 4px 0 0 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.edit-body {
  padding: 20px;
  max-width: 950px;
  width: 100%;
}

.role-section {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 16px;
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
