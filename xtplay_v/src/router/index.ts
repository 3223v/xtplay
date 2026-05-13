import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/LandingView.vue'),
    },
    {
      path: '/dashboard',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/manage',
      name: 'manage',
      component: () => import('@/views/manage/ManageLayout.vue'),
      redirect: '/manage/roles',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/manage/RolesView.vue'),
        },
        {
          path: 'presets',
          name: 'presets',
          component: () => import('@/views/manage/PresetsView.vue'),
        },
        {
          path: 'entries',
          name: 'entries',
          component: () => import('@/views/manage/EntriesView.vue'),
        },
        {
          path: 'lorebooks',
          name: 'lorebooks',
          component: () => import('@/views/manage/LorebooksView.vue'),
        },
        {
          path: 'stories',
          name: 'stories',
          component: () => import('@/views/manage/StoriesView.vue'),
        },
        {
          path: 'prompts',
          name: 'prompts',
          component: () => import('@/views/manage/PromptsView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/manage/UsersView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
      ],
    },
    {
      path: '/read',
      name: 'read',
      component: () => import('@/views/ReadView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      next('/login')
      return
    }
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next('/')
      return
    }
  }
  next()
})

export default router
