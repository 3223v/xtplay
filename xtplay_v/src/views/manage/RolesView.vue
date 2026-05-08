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
        :title="`编辑角色: ${store.selectedItem.name || '未命名'}`"
        :subtitle="`ID: ${store.selectedItem.id}`"
        :saving="store.loading"
        @save="handleSave"
      >
        <el-form :model="formData" label-position="top" class="edit-form">
          <el-row :gutter="100">
            <el-col :span="12">
              <el-form-item label="名称 *">
                <el-input v-model="formData.name" placeholder="角色名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="规格">
                <el-input v-model="formData.spec" placeholder="角色规格" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="描述">
            <el-input v-model="formData.description" type="textarea" :rows="4" placeholder="角色描述" />
          </el-form-item>

          <el-form-item label="标签">
            <el-tag-list v-model="tags" />
          </el-form-item>

          <el-divider content-position="left">角色设定</el-divider>

          <el-form-item label="性格特点">
            <el-input v-model="formData.personality" type="textarea" :rows="6" placeholder="角色的性格特点，例如：开朗乐观、内向敏感、善良正直、幽默风趣..." />
          </el-form-item>

          <el-form-item label="默认场景">
            <el-input v-model="formData.scenario" type="textarea" :rows="4" placeholder="角色所处的默认场景描述..." />
          </el-form-item>

          <el-divider content-position="left">对话配置</el-divider>

          <el-form-item label="开场消息">
            <el-input v-model="formData.first_mes" type="textarea" :rows="8" placeholder="角色的第一条消息，用于开场..." />
          </el-form-item>

          <el-form-item label="备选问候语">
            <el-tag-list v-model="alternateGreetings" />
          </el-form-item>

          <el-form-item label="消息示例">
            <el-input v-model="formData.mes_example" type="textarea" :rows="8" placeholder="角色对话示例，展示角色的说话风格，建议包含多个对话回合..." />
          </el-form-item>

          <el-divider content-position="left">系统设置</el-divider>

          <el-form-item label="系统提示">
            <el-input v-model="formData.system_prompt" type="textarea" :rows="8" placeholder="系统提示词，定义角色的行为准则和性格设定..." />
          </el-form-item>

          <el-form-item label="历史指令">
            <el-input v-model="formData.post_history_instructions" type="textarea" :rows="4" placeholder="对话历史后的指令..." />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="头像">
                <el-input v-model="formData.avatar" placeholder="头像 URL" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="创建者备注">
                <el-input v-model="formData.creator_notes" type="textarea" :rows="3" placeholder="备注信息..." />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </edit-panel>
      <edit-panel v-else title="请选择一个角色" subtitle="从左侧列表选择角色进行编辑">
        <el-empty description="请选择一个角色" />
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

onMounted(() => {
  store.fetchAll()
})

function handleSelect(id: number) {
  store.select(id)
}

async function handleCreate() {
  try {
    const created = await store.create({ name: '新角色' })
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
  try {
    const data = {
      ...formData,
      tags: tags.value,
      alternate_greetings: alternateGreetings.value,
    }
    await store.update(store.selectedItem.id, data)
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped>
.edit-form {
  max-width: 950px;
  width: 100%;
}

:deep(.el-textarea__inner) {
  font-family: inherit;
  font-size: 15px;
  line-height: 1.8;
}

:deep(.el-input__inner) {
  font-size: 15px;
}

/* 角色列表项字体 */
.item-title {
  font-size: 15px;
}

.item-subtitle {
  font-size: 13px;
}

/* 标题字体 */
.list-title,
.edit-title {
  font-size: 17px;
}

.edit-subtitle {
  font-size: 14px;
}
</style>
