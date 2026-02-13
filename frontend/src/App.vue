<template>
  <div class="app-layout">
    <AppHeader />
    <div class="app-body">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
</script>

<style scoped lang="scss">
.app-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-body {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.app-body > * {
  flex: 1;
}
</style>
