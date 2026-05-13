<template>
  <div class="profile-page">
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-avatar">
          <span>{{ userInitial }}</span>
        </div>
        <div class="profile-heading">
          <h1>个人信息</h1>
          <span class="profile-role" :class="'role-' + authStore.userRole">{{ roleLabel }}</span>
        </div>
      </div>

      <div class="profile-body">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input v-model="formData.username" class="form-input" placeholder="用户名" />
        </div>
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input v-model="formData.email" class="form-input" placeholder="邮箱" />
        </div>
        <div class="form-group">
          <label class="form-label">新密码</label>
          <input v-model="formData.password" type="password" class="form-input" placeholder="留空则不修改密码" />
        </div>

        <div class="form-actions">
          <button class="btn-primary" :disabled="saving" @click="handleSave">
            <svg v-if="saving" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { authService } from '@/api'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
const saving = ref(false)

const formData = reactive({
  username: '',
  email: '',
  password: '',
})

const userInitial = computed(() => {
  const name = authStore.user?.username
  return name ? name.charAt(0).toUpperCase() : '?'
})

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
    normal: '普通用户',
  }
  return map[authStore.userRole] || '未知'
})

onMounted(() => {
  if (authStore.user) {
    formData.username = authStore.user.username
    formData.email = authStore.user.email
  }
})

async function handleSave() {
  saving.value = true
  try {
    const payload: Record<string, string> = {}
    if (formData.username !== authStore.user?.username) payload.username = formData.username
    if (formData.email !== authStore.user?.email) payload.email = formData.email
    if (formData.password) payload.password = formData.password

    if (Object.keys(payload).length === 0) {
      ElMessage.info('没有需要修改的内容')
      return
    }

    const updated = await authService.updateMe(payload)
    authStore.setUser(updated)
    ElMessage.success('保存成功')
    formData.password = ''
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 520px;
  margin: 60px auto;
  padding: 0 24px;
}

.profile-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 32px 32px 24px;
  border-bottom: 1px solid var(--border);
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  flex-shrink: 0;
}

.profile-heading h1 {
  font-size: var(--font-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.profile-role {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
  letter-spacing: 0.04em;
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

.profile-body {
  padding: 24px 32px 32px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--font-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--primary-light);
}

.form-actions {
  padding-top: 8px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-light);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
