<template>
  <div class="step-view storyboard">
    <h1 class="step-title">分镜脚本</h1>
    <p class="step-desc">AI 将剧本拆分为多个分镜，每个分镜包含画面描述、台词、镜头运动</p>

    <div class="toolbar">
      <button class="btn-primary" @click="generateStoryboard" :disabled="isGenerating">
        <span v-if="isGenerating">⏳ 生成中...</span>
        <span v-else">✨ AI 生成分镜</span>
      </button>
      <button class="btn-secondary" @click="generateAllImages" :disabled="scenes.length === 0">
        🎨 批量生成图片
      </button>
      <button class="btn-secondary" @click="addScene">+ 手动添加分镜</button>
    </div>

    <div class="scenes-list">
      <div class="scene-card" v-for="(scene, index) in scenes" :key="scene.id">
        <div class="scene-header">
          <span class="scene-number">分镜 {{ index + 1 }}</span>
          <div class="scene-header-actions">
            <button class="btn-ghost btn-sm" @click="removeScene(scene.id)">删除</button>
          </div>
        </div>

        <div class="scene-body">
          <div class="scene-thumb">
            <img v-if="scene.imageUrl" :src="scene.imageUrl" alt="" />
            <div v-else class="thumb-placeholder" :class="scene.status">
              <span v-if="scene.status === 'generating'">⏳</span>
              <span v-else>🎬</span>
              <button 
                class="btn-ghost btn-sm" 
                @click="generateImage(scene.id)"
                :disabled="!scene.description || isGeneratingImages[scene.id]"
              >
                <span v-if="isGeneratingImages[scene.id]">生成中...</span>
                <span v-else>生成图片</span>
              </button>
            </div>
          </div>

          <div class="scene-fields">
            <div class="field">
              <label>画面描述</label>
              <el-input
                v-model="scene.description"
                type="textarea"
                :rows="3"
                placeholder="描述这个分镜的画面内容..."
              />
            </div>
            <div class="field-row">
              <div class="field">
                <label>时长（秒）</label>
                <el-input-number v-model="scene.duration" :min="1" :max="30" :step="1" size="small" />
              </div>
              <div class="field">
                <label>镜头运动</label>
                <el-select v-model="scene.cameraMovement.type" size="small">
                  <el-option label="静止" value="static" />
                  <el-option label="左移" value="pan-left" />
                  <el-option label="右移" value="pan-right" />
                  <el-option label="上移" value="pan-up" />
                  <el-option label="下移" value="pan-down" />
                  <el-option label="推进" value="zoom-in" />
                  <el-option label="拉远" value="zoom-out" />
                </el-select>
              </div>
              <div class="field">
                <label>转场效果</label>
                <el-select v-model="scene.transition" size="small">
                  <el-option label="淡入淡出" value="fade" />
                  <el-option label="左滑" value="slide-left" />
                  <el-option label="溶解" value="dissolve" />
                  <el-option label="无" value="none" />
                </el-select>
              </div>
            </div>
            <div class="field">
              <label>台词/旁白</label>
              <el-input v-model="scene.narration" type="textarea" :rows="2" placeholder="这个镜头的台词或旁白..." />
            </div>
          </div>
        </div>
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
import { ElMessage, ElNotification } from 'element-plus'
import { aiService } from '@/services/ai'
import type { Scene } from '@/types'

const route = useRoute()
const router = useRouter()
const isGenerating = ref(false)
const isGeneratingImages = ref<Record<string, boolean>>({})

const scenes = ref<Scene[]>([])

function createEmptyScene(order: number): Scene {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    order,
    description: '',
    imageUrl: '',
    videoUrl: '',
    thumbnailUrl: '',
    duration: 5,
    transition: 'fade',
    roleIds: [],
    dialogue: null,
    narration: '',
    cameraMovement: { type: 'static', speed: 0.5 },
    status: 'pending',
    videoStatus: 'pending',
  }
}

function addScene() {
  scenes.value.push(createEmptyScene(scenes.value.length + 1))
}

function removeScene(id: string) {
  scenes.value = scenes.value.filter(s => s.id !== id)
  scenes.value.forEach((s, i) => s.order = i + 1)
}

async function generateStoryboard() {
  isGenerating.value = true
  
  try {
    // TODO: 调用真实的 AI 分镜生成 API
    await new Promise(r => setTimeout(r, 2000))
    
    // Mock: 生成 5 个分镜
    scenes.value = Array.from({ length: 5 }, (_, i) => ({
      ...createEmptyScene(i + 1),
      description: `第 ${i + 1} 个分镜的画面描述（AI 生成）`,
      narration: `第 ${i + 1} 个分镜的旁白文字`,
    }))
    
    ElNotification.success({
      title: '分镜生成成功',
      message: `已生成 ${scenes.value.length} 个分镜场景`,
    })
  } catch (error: any) {
    ElMessage.error('分镜生成失败: ' + error.message)
  } finally {
    isGenerating.value = false
  }
}

async function generateImage(sceneId: string) {
  const scene = scenes.value.find(s => s.id === sceneId)
  if (!scene) return

  if (!scene.description) {
    ElMessage.warning('请先填写画面描述')
    return
  }

  isGeneratingImages.value[sceneId] = true
  scene.status = 'generating'

  try {
    // 调用 Babelark 图片生成
    const response = await aiService.generateStoryboardImage(
      scene,
      'japanese', // TODO: 从全局设置获取风格
      '9:16'
    )
    
    scene.imageUrl = response
    scene.thumbnailUrl = response
    scene.status = 'generated'
    
    ElNotification.success({
      title: '图片生成成功',
      message: `分镜 ${scene.order} 的图片已生成`,
    })
  } catch (error: any) {
    scene.status = 'error'
    console.error('图片生成失败:', error)
    ElNotification.error({
      title: '图片生成失败',
      message: error.message || '请稍后重试',
    })
  } finally {
    isGeneratingImages.value[sceneId] = false
  }
}

async function generateAllImages() {
  const scenesWithoutImages = scenes.value.filter(s => s.description && !s.imageUrl)
  
  if (scenesWithoutImages.length === 0) {
    ElMessage.warning('所有分镜都已生成图片')
    return
  }

  ElMessage.info(`开始批量生成 ${scenesWithoutImages.length} 张图片...`)

  for (const scene of scenesWithoutImages) {
    await generateImage(scene.id)
  }

  ElNotification.success({
    title: '批量生成完成',
    message: `已生成 ${scenesWithoutImages.length} 张分镜图片`,
    duration: 5000,
  })
}

function goBack() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/scene-assets`)
}

function saveAndNext() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard-video`)
}
</script>

<style scoped lang="scss">
.step-view { max-width: 900px; }
.step-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.step-desc { font-size: 14px; color: #999; margin-bottom: 24px; }

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.scenes-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scene-card {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

.scene-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.scene-number {
  font-size: 14px;
  font-weight: 700;
  color: #4CAF50;
}

.scene-body {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.scene-thumb {
  width: 200px;
  min-width: 200px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  background: #111;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666;
  font-size: 32px;

  &.generating {
    color: #4CAF50;
    animation: pulse 1.5s ease-in-out infinite;
  }

  button {
    font-size: 12px;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.scene-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  label { font-size: 12px; color: #999; font-weight: 600; }
}

.field-row {
  display: flex;
  gap: 16px;
  .field { flex: 1; }
}

.btn-sm { padding: 4px 12px; font-size: 12px; }

.step-actions {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
}
</style>
