<template>
  <div class="users-layout">
    <div class="list-panel">
      <div class="list-header">
        <h2 class="list-title">用户管理</h2>
        <span class="list-count">{{ users.length }} 人</span>
      </div>
      <div class="list-body">
        <div
          v-for="u in users"
          :key="u.id"
          class="list-item"
          :class="{ active: selectedUser?.id === u.id }"
          @click="handleSelect(u)"
        >
          <div class="item-avatar">{{ u.username.charAt(0).toUpperCase() }}</div>
          <div class="item-content">
            <div class="item-title">{{ u.username }}</div>
            <div class="item-meta">
              <span class="item-role" :class="'role-' + u.role">{{ roleMap[u.role] || u.role }}</span>
            </div>
          </div>
        </div>
        <div v-if="users.length === 0" class="list-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p>暂无用户</p>
        </div>
      </div>
    </div>
    <div class="edit-panel">
      <template v-if="selectedUser">
        <div class="edit-header">
          <div>
            <h3 class="edit-title">{{ selectedUser.username }}</h3>
            <p class="edit-subtitle">ID: {{ selectedUser.id }}</p>
          </div>
          <div class="edit-actions">
            <button class="btn-ghost btn-sm" @click="selectedUser = null">取消</button>
            <button class="btn-primary btn-sm" :disabled="saving" @click="handleSave">
              <svg v-if="saving" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              保存
            </button>
          </div>
        </div>
        <div class="edit-body">
          <div class="edit-form">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input v-model="editForm.username" class="form-input" placeholder="用户名" />
            </div>
            <div class="form-group">
              <label class="form-label">邮箱</label>
              <input v-model="editForm.email" class="form-input" placeholder="邮箱" />
            </div>
            <div class="form-group">
              <label class="form-label">新密码</label>
              <input v-model="editForm.password" type="password" class="form-input" placeholder="留空则不修改密码" />
            </div>
            <div class="form-divider">角色</div>
            <div class="form-group">
              <label class="form-label">当前角色</label>
              <div class="role-display">
                <span class="item-role large" :class="'role-' + selectedUser.role">{{ roleMap[selectedUser.role] || selectedUser.role }}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">修改角色</label>
              <select v-model="editRole" class="form-select" :disabled="selectedUser.role === 'super_admin'">
                <option v-if="selectedUser.role === 'super_admin'" value="super_admin">超级管理员（不可修改）</option>
                <option value="normal">普通用户</option>
                <option value="admin">管理员</option>
                <option value="super_admin">超级管理员</option>
              </select>
              <p v-if="selectedUser.role === 'super_admin'" class="form-hint">超级管理员角色不可修改</p>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="edit-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>请选择一个用户</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { authService } from '@/api'
import { useAuthStore } from '@/stores'
import type { UserPublic } from '@/types'

const authStore = useAuthStore()
const users = ref<UserPublic[]>([])
const selectedUser = ref<UserPublic | null>(null)
const saving = ref(false)
const editRole = ref('normal')

const editForm = reactive({
  username: '',
  email: '',
  password: '',
})

const roleMap: Record<string, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  normal: '普通用户',
}

onMounted(() => {
  fetchUsers()
})

async function fetchUsers() {
  try {
    users.value = await authService.listUsers()
  } catch {
    ElMessage.error('获取用户列表失败')
  }
}

function handleSelect(u: UserPublic) {
  selectedUser.value = u
  editForm.username = u.username
  editForm.email = u.email
  editForm.password = ''
  editRole.value = u.role
}

async function handleSave() {
  if (!selectedUser.value) return
  saving.value = true
  try {
    const payload: Record<string, string> = {}
    if (editForm.username !== selectedUser.value.username) payload.username = editForm.username
    if (editForm.email !== selectedUser.value.email) payload.email = editForm.email
    if (editForm.password) payload.password = editForm.password

    if (Object.keys(payload).length > 0) {
      await authService.updateUser(selectedUser.value.id, payload)
    }

    if (editRole.value !== selectedUser.value.role && selectedUser.value.role !== 'super_admin') {
      await authService.updateUserRole(selectedUser.value.id, { role: editRole.value as 'normal' | 'admin' | 'super_admin' })
    }

    ElMessage.success('保存成功')
    await fetchUsers()
    const updated = users.value.find(u => u.id === selectedUser.value!.id)
    if (updated) {
      selectedUser.value = updated
      editForm.username = updated.username
      editForm.email = updated.email
    }
    editForm.password = ''
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.users-layout {
  display: flex;
  height: 100%;
}

.list-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.list-title {
  font-size: var(--font-lg);
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.list-count {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 2px;
}

.list-item:hover {
  background: var(--bg-main);
}

.list-item.active {
  background: var(--primary-bg);
}

.item-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--primary-bg);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.list-item.active .item-avatar {
  background: var(--primary);
  color: white;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.item-role {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 8px;
  letter-spacing: 0.04em;
}

.item-role.large {
  font-size: 12px;
  padding: 3px 12px;
  border-radius: 10px;
}

.role-normal {
  background: rgba(148, 163, 184, 0.15);
  color: #64748b;
}

.role-admin {
  background: rgba(99, 102, 241, 0.12);
  color: var(--primary);
}

.role-super_admin {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: var(--text-tertiary);
}

.list-empty svg { opacity: 0.3; margin-bottom: 12px; }
.list-empty p { font-size: var(--font-sm); margin: 0; }

.edit-panel {
  flex: 1;
  background: var(--bg-main);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.edit-title {
  font-size: var(--font-lg);
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.edit-subtitle {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  margin: 4px 0 0 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.edit-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.edit-form {
  max-width: 500px;
}

.edit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
}

.edit-empty svg { opacity: 0.3; margin-bottom: 12px; }
.edit-empty p { font-size: var(--font-sm); margin: 0; }

.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: var(--font-sm); font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.form-input:focus { border-color: var(--primary-light); }
.form-select { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: var(--font-sm); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; background: var(--bg-card); cursor: pointer; }
.form-select:focus { border-color: var(--primary-light); }
.form-select:disabled { opacity: 0.5; cursor: not-allowed; }
.form-divider { font-size: var(--font-sm); font-weight: 600; color: var(--text-secondary); padding: 16px 0 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
.form-hint { font-size: var(--font-xs); color: var(--text-tertiary); margin: 4px 0 0; }

.role-display { padding: 4px 0; }

.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--primary); color: white; border: none; border-radius: var(--radius-sm); font-size: var(--font-sm); font-weight: 500; cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans); }
.btn-primary:hover:not(:disabled) { background: var(--primary-light); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: var(--font-sm); font-weight: 500; cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans); }
.btn-ghost:hover { border-color: var(--primary-light); color: var(--primary); }
.btn-sm { padding: 5px 12px; font-size: var(--font-xs); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>
