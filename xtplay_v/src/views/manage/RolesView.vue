<template>
  <crud-layout
    title="角色管理"
    :items="store.items"
    :selected-id="store.selectedId"
    :searchable="true"
    search-placeholder="搜索角色..."
    empty-text="暂无角色"
    @select="handleSelect"
    @create="handleCreate"
    @delete="handleDelete"
  >
    <template #edit>
      <edit-panel
        v-if="store.selectedItem"
        :title="`${store.selectedItem.name || '未命名角色'}`"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="store.loading"
        :import-export-data="store.selectedItem"
        entity-name="role"
        @save="handleSave"
        @import="handleImport"
      >
        <div class="edit-form">
          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">名称 *</label>
                <input v-model="formData.name" class="form-input" placeholder="角色名称" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">规格</label>
                <input v-model="formData.spec" class="form-input" placeholder="角色卡规范" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="formData.description" class="form-textarea" rows="3" placeholder="角色描述" />
          </div>

          <div class="form-group">
            <label class="form-label">标签</label>
            <tag-list v-model="tags" />
          </div>

          <div class="form-divider">角色设定</div>

          <div class="form-group">
            <label class="form-label">性格特点</label>
            <textarea v-model="formData.personality" class="form-textarea" rows="5" placeholder="角色的性格特点，例如：开朗乐观、内向敏感..." />
          </div>

          <div class="form-group">
            <label class="form-label">默认场景</label>
            <textarea v-model="formData.scenario" class="form-textarea" rows="3" placeholder="角色所处的默认场景描述..." />
          </div>

          <div class="form-divider">对话配置</div>

          <div class="form-group">
            <label class="form-label">开场消息</label>
            <textarea v-model="formData.first_mes" class="form-textarea" rows="5" placeholder="角色的第一条消息，用于开场..." />
          </div>

          <div class="form-group">
            <label class="form-label">备选问候语</label>
            <tag-list v-model="alternateGreetings" />
          </div>

          <div class="form-group">
            <label class="form-label">消息示例</label>
            <textarea v-model="formData.mes_example" class="form-textarea" rows="5" placeholder="角色对话示例，展示角色的说话风格..." />
          </div>

          <div class="form-divider">系统设置</div>

          <div class="form-group">
            <label class="form-label">系统提示</label>
            <textarea v-model="formData.system_prompt" class="form-textarea" rows="5" placeholder="系统提示词，定义角色的行为准则..." />
          </div>

          <div class="form-group">
            <label class="form-label">历史指令</label>
            <textarea v-model="formData.post_history_instructions" class="form-textarea" rows="3" placeholder="对话历史后的指令..." />
          </div>

          <div class="form-row">
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">头像</label>
                <input v-model="formData.avatar" class="form-input" placeholder="头像 URL" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label class="form-label">创建者备注</label>
                <textarea v-model="formData.creator_notes" class="form-textarea" rows="2" placeholder="备注信息..." />
              </div>
            </div>
          </div>
        </div>
      </edit-panel>
      <edit-panel v-else title="选择一个角色" subtitle="从左侧列表选择角色进行编辑">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <p>请选择一个角色</p>
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
import TagList from '@/components/TagList.vue'
import { useRoleStore } from '@/stores'
import type { Role } from '@/types'

const store = useRoleStore()

const tags = ref<string[]>([])
const alternateGreetings = ref<string[]>([])

const formData = reactive<Partial<Role>>({
  name: '',
  spec: '',
  description: '',
  personality: '',
  first_mes: '',
  avatar: '',
  mes_example: '',
  scenario: '',
  creator_notes: '',
  system_prompt: '',
  post_history_instructions: '',
})

watch(() => store.selectedItem, (item) => {
  if (item) {
    Object.assign(formData, {
      name: item.name,
      spec: item.spec,
      description: item.description,
      personality: item.personality,
      first_mes: item.first_mes,
      avatar: item.avatar,
      mes_example: item.mes_example,
      scenario: item.scenario,
      creator_notes: item.creator_notes,
      system_prompt: item.system_prompt,
      post_history_instructions: item.post_history_instructions,
    })
    tags.value = item.tags || []
    alternateGreetings.value = item.alternate_greetings || []
  }
}, { immediate: true })

onMounted(() => { store.fetchAll() })

function handleSelect(id: number) { store.select(id) }

async function handleCreate() {
  try {
    const created = await store.create({ name: '新角色' })
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
  try {
    await store.update(store.selectedItem.id, { ...formData, tags: tags.value, alternate_greetings: alternateGreetings.value })
    ElMessage.success('保存成功')
  } catch { ElMessage.error('保存失败') }
}

async function handleImport(data: unknown) {
  try {
    const created = await store.create(data as Partial<Role>)
    store.select(created.id)
    ElMessage.success('导入成功')
  } catch { ElMessage.error('导入失败') }
}
</script>

<style scoped>
.edit-form {
  max-width: 800px;
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
.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: var(--font-sm); font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-input:focus { border-color: var(--primary-light); }
.form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); line-height: var(--leading-relaxed); color: var(--text-primary); resize: vertical; outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-textarea:focus { border-color: var(--primary-light); }
.form-divider { font-size: var(--font-sm); font-weight: 600; color: var(--text-secondary); padding: 16px 0 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
</style>
