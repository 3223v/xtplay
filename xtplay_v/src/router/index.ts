import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/manage',
      name: 'manage',
      component: () => import('@/views/manage/ManageLayout.vue'),
      redirect: '/manage/roles',
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
      ],
    },
    {
      path: '/read',
      name: 'read',
      component: () => import('@/views/ReadView.vue'),
    },
  ],
})

export default router
