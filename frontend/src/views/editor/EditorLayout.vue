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
import { onMounted, onBeforeUnmount } from 'vue'
import WorkflowSidebar from '@/components/common/WorkflowSidebar.vue'
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!projectStore.currentProject) return
  // Best-effort save before leaving the page
  void projectStore.saveCurrentProject()
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
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
