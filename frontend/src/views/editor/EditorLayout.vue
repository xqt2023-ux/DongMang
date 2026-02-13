<template>
  <div class="editor-layout">
    <WorkflowSidebar />
    <main class="editor-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import WorkflowSidebar from '@/components/common/WorkflowSidebar.vue'
</script>

<style scoped lang="scss">
.editor-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}
</style>
