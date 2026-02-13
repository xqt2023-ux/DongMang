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
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { aiService } from '@/services'

const route = useRoute()
const router = useRouter()

const synopsis = ref('')
const fullScript = ref('')
const isGenerating = ref(false)

async function generateScript() {
  if (!synopsis.value.trim()) {
    ElMessage.warning('请先输入故事梗概')
    return
  }
  
  isGenerating.value = true
  ElMessage.info('正在生成剧本，请稍候...')
  
  try {
    const script = await aiService.generateScript(synopsis.value, 'fantasy')
    fullScript.value = script
    ElMessage.success('剧本生成完成！')
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
.step-actions {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
}
</style>
