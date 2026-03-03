<template>
  <div class="step-view story-script">
    <h1 class="step-title">故事剧本</h1>
    <p class="step-desc">输入故事梗概，AI 会自动扩展生成完整剧本，你也可以手动编辑</p>

    <div class="form-section">
      <div class="form-group">
        <label class="form-label">故事梗概</label>
        <el-input
          v-model="synopsis"
          type="textarea"
          :rows="4"
          placeholder="简要描述你的故事大纲，例如：在末日废墟中，少年驾驶机甲与外星寄生体激战..."
        />
      </div>

      <div class="ai-actions">
        <button class="btn-primary" @click="generateScript" :disabled="isGenerating">
          <span v-if="isGenerating">⏳ 生成中...</span>
          <span v-else>✨ AI 生成剧本</span>
        </button>
      </div>

      <div v-if="hasGenerationMeta" class="generation-meta">
        <el-tag size="small" :type="generationFallbackUsed ? 'warning' : 'success'">
          {{ generationFallbackUsed ? '兜底剧本' : '模型剧本' }}
        </el-tag>
        <span class="meta-text">来源模型：{{ generationModelUsed }}</span>
      </div>

      <div class="form-group">
        <label class="form-label">完整剧本</label>
        <el-input
          v-model="fullScript"
          type="textarea"
          :rows="16"
          placeholder="AI 生成的完整剧本将显示在这里，你可以自由编辑..."
        />
      </div>
    </div>

    <div class="step-actions">
      <button class="btn-secondary" @click="goBack">← 上一步</button>
      <button class="btn-primary" @click="saveAndNext">保存并下一步 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { aiService } from '@/services'
import { useProjectStore } from '@/stores/project'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const synopsis = ref('')
const fullScript = ref('')
const isGenerating = ref(false)
const generationModelUsed = ref('')
const generationFallbackUsed = ref(false)
const hasGenerationMeta = computed(() => !!generationModelUsed.value)

onMounted(() => {
  const project = projectStore.currentProject
  if (!project) return

  synopsis.value = project.description || ''
  fullScript.value = project.script || ''
})

watch(synopsis, (value) => {
  const project = projectStore.currentProject
  if (!project) return
  project.description = value
})

watch(fullScript, (value) => {
  const project = projectStore.currentProject
  if (!project) return
  project.script = value
})

async function generateScript() {
  if (!synopsis.value.trim()) {
    ElMessage.warning('请先输入故事梗概')
    return
  }
  
  isGenerating.value = true
  ElMessage.info('正在生成剧本，请稍候...')
  
  try {
    const result = await aiService.generateScript(synopsis.value, 'fantasy')
    fullScript.value = result.script
    generationModelUsed.value = result.modelUsed || 'unknown'
    generationFallbackUsed.value = !!result.fallbackUsed
    const project = projectStore.currentProject
    if (project) project.script = result.script

    const sourceLabel = generationFallbackUsed.value
      ? `兜底模板（${generationModelUsed.value}）`
      : `模型：${generationModelUsed.value}`
    ElMessage.success(`剧本生成完成！来源：${sourceLabel}`)
  } catch (error) {
    console.error('生成剧本失败:', error)
    ElMessage.error('剧本生成失败，请稍后重试')
  } finally {
    isGenerating.value = false
  }
}

function goBack() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/global-settings`)
}

function saveAndNext() {
  const project = projectStore.currentProject
  if (project) {
    project.description = synopsis.value
    project.script = fullScript.value
  }
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/scene-assets`)
}
</script>

<style scoped lang="scss">
.step-view {
  max-width: 800px;
}
.step-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.step-desc { font-size: 14px; color: #999; margin-bottom: 32px; }
.form-section { display: flex; flex-direction: column; gap: 24px; }
.form-group { display: flex; flex-direction: column; gap: 10px; }
.form-label { font-size: 14px; font-weight: 600; color: #ccc; }
.ai-actions { display: flex; gap: 12px; }

.generation-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: -10px;

  .meta-text {
    font-size: 12px;
    color: #9aa4af;
  }
}

.step-actions {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
}
</style>
