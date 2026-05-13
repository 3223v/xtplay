<template>
  <el-config-provider>
    <app-layout v-if="!isLanding" />
    <router-view v-else />
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'

const route = useRoute()
const isLanding = computed(() => route.name === 'landing')
</script>
