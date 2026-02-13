<template>
  <div class="step-view storyboard-video">
    <h1 class="step-title">分镜视频</h1>
    <p class="step-desc">为每个分镜生成 AI 视频片段（图生视频），使用 Babelark AI 平台</p>

    <div class="toolbar">
      <div class="model-selector">
        <label>视频模型：</label>
        <el-select v-model="selectedModel" size="default">
          <el-option label="豆包 Seedance 1.5 Pro (推荐)" value="doubao-seedance-1-5-pro" />
          <el-option label="阿里通义万相 Wan2.6" value="wan2.6-i2v" />
        </el-select>
      </div>
      <div class="video-settings">
        <el-select v-model="resolution" size="small">
          <el-option label="480P" value="480P" />
          <el-option label="720P" value="720P" />
          <el-option label="1080P" value="1080P" />
        </el-select>
        <el-select v-model="aspectRatio" size="small">
          <el-option label="9:16 竖屏" value="9:16" />
          <el-option label="16:9 横屏" value="16:9" />
          <el-option label="1:1 方形" value="1:1" />
        </el-select>
      </div>
      <button class="btn-primary" @click="generateAllVideos" :disabled="isGenerating || allScenesNoImage">
        <span v-if="isGenerating">⏳ 批量生成中 ({{ completedCount }}/{{ totalCount }})</span>
        <span v-else>🎬 批量生成全部视频</span>
      </button>
    </div>

    <!-- 进度条 -->
    <div v-if="isGenerating" class="progress-section">
      <el-progress :percentage="overallProgress" :status="progressStatus" />
      <p class="progress-text">{{ progressText }}</p>
    </div>

    <div class="video-grid">
      <div class="video-card" v-for="(scene, index) in scenes" :key="scene.id">
        <div class="video-preview">
          <video v-if="scene.videoUrl" :src="scene.videoUrl" controls />
          <img v-else-if="scene.imageUrl" :src="scene.imageUrl" alt="分镜图片" />
          <div v-else class="preview-placeholder" :class="scene.videoStatus">
            <span v-if="scene.videoStatus === 'pending'">⏸️ 等待生成</span>
            <span v-else-if="scene.videoStatus === 'queued'">🕒 排队中...</span>
            <span v-else-if="scene.videoStatus === 'generating'">
              <el-icon class="is-loading"><Loading /></el-icon>
              生成中 {{ sceneProgress[scene.id] || 0 }}%
            </span>
            <span v-else-if="scene.videoStatus === 'error'">❌ 生成失败</span>
          </div>
        </div>
        <div class="video-info">
          <span class="video-label">分镜 {{ index + 1 }}</span>
          <span class="video-duration">{{ scene.duration }}s</span>
          <el-tag 
            v-if="scene.videoStatus !== 'pending'" 
            :type="getStatusTagType(scene.videoStatus)" 
            size="small"
          >
            {{ getStatusText(scene.videoStatus) }}
          </el-tag>
        </div>
        <p class="video-desc">{{ scene.description || '暂无描述' }}</p>
        <div class="video-actions">
          <button 
            class="btn-ghost btn-sm" 
            @click="generateVideo(scene.id)" 
            :disabled="!scene.imageUrl || isGeneratingSingle[scene.id]"
          >
            <span v-if="isGeneratingSingle[scene.id]">生成中...</span>
            <span v-else>{{ scene.videoUrl ? '重新生成' : '生成视频' }}</span>
          </button>
          <el-popconfirm
            v-if="scene.videoUrl"
            title="确定删除这个视频吗？"
            @confirm="deleteVideo(scene.id)"
          >
            <template #reference>
              <button class="btn-ghost btn-sm btn-danger">删除视频</button>
            </template>
          </el-popconfirm>
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
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification, ElIcon } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { aiService } from '@/services/ai'
import type { Scene, VideoGenStatus } from '@/types'

const route = useRoute()
const router = useRouter()

const selectedModel = ref('doubao-seedance-1-5-pro')
const resolution = ref<'480P' | '720P' | '1080P'>('720P')
const aspectRatio = ref<'1:1' | '16:9' | '9:16'>('9:16')
const isGenerating = ref(false)
const isGeneratingSingle = ref<Record<string, boolean>>({})
const sceneProgress = ref<Record<string, number>>({})

// TODO: 从 Pinia store 获取分镜列表
const scenes = ref<Scene[]>([
  {
    id: '1',
    order: 1,
    description: '一只橘色的猫咪坐在樱花树下，粉色的花瓣飘落，猫咪看着远处飞舞的蝴蝶',
    imageUrl: 'https://atlas-media.oss-us-west-1.aliyuncs.com/images/cbb32f59-ecc4-46ad-b490-e529fdeee325.jpg',
    videoUrl: '',
    thumbnailUrl: '',
    duration: 5,
    transition: 'fade',
    roleIds: [],
    dialogue: null,
    narration: '',
    cameraMovement: { type: 'static', speed: 0.5 },
    status: 'generated',
    videoStatus: 'pending',
  },
])

const completedCount = computed(() => 
  scenes.value.filter(s => s.videoStatus === 'generated').length
)

const totalCount = computed(() => scenes.value.length)

const overallProgress = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

const progressStatus = computed(() => {
  if (completedCount.value === totalCount.value) return 'success'
  return undefined
})

const progressText = computed(() => {
  if (completedCount.value === totalCount.value) {
    return '🎉 全部视频生成完成！'
  }
  return `正在生成第 ${completedCount.value + 1}/${totalCount.value} 个视频...`
})

const allScenesNoImage = computed(() => 
  scenes.value.every(s => !s.imageUrl)
)

function getStatusTagType(status: VideoGenStatus): '' | 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<VideoGenStatus, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    pending: 'info',
    queued: 'warning',
    generating: 'warning',
    generated: 'success',
    error: 'danger',
  }
  return map[status] || 'info'
}

function getStatusText(status: VideoGenStatus): string {
  const map: Record<VideoGenStatus, string> = {
    pending: '待生成',
    queued: '排队中',
    generating: '生成中',
    generated: '已完成',
    error: '失败',
  }
  return map[status] || '未知'
}

async function generateVideo(sceneId: string) {
  const scene = scenes.value.find(s => s.id === sceneId)
  if (!scene) return

  if (!scene.imageUrl) {
    ElMessage.warning('请先生成分镜图片')
    return
  }

  isGeneratingSingle.value[sceneId] = true
  scene.videoStatus = 'queued'
  sceneProgress.value[sceneId] = 0

  try {
    // 调用 Babelark 视频生成
    const result = await aiService.generateVideoFromImage({
      prompt: scene.description || '动态画面，流畅自然',
      imageUrl: scene.imageUrl,
      duration: scene.duration || 5,
      resolution: resolution.value,
      aspectRatio: aspectRatio.value,
      useAliModel: selectedModel.value === 'wan2.6-i2v',
    })

    scene.videoStatus = 'generating'
    sceneProgress.value[sceneId] = 10

    // 轮询查询状态
    const videoUrl = await aiService.pollVideoGeneration(
      result.taskId,
      selectedModel.value === 'wan2.6-i2v',
      60, // 最多60次
      5000 // 每5秒查询一次
    )

    scene.videoUrl = videoUrl
    scene.videoStatus = 'generated'
    sceneProgress.value[sceneId] = 100

    ElNotification.success({
      title: '视频生成成功',
      message: `分镜 ${scene.order} 的视频已生成完成`,
    })
  } catch (error: any) {
    scene.videoStatus = 'error'
    console.error('视频生成失败:', error)
    ElNotification.error({
      title: '视频生成失败',
      message: error.message || '请稍后重试',
    })
  } finally {
    isGeneratingSingle.value[sceneId] = false
  }
}

async function generateAllVideos() {
  const scenesToGenerate = scenes.value.filter(s => s.imageUrl && !s.videoUrl)
  
  if (scenesToGenerate.length === 0) {
    ElMessage.warning('没有需要生成的视频（所有场景都已生成或缺少分镜图片）')
    return
  }

  isGenerating.value = true

  try {
    for (const scene of scenesToGenerate) {
      await generateVideo(scene.id)
    }
    
    ElNotification.success({
      title: '批量生成完成',
      message: `成功生成 ${completedCount.value} 个视频`,
      duration: 5000,
    })
  } finally {
    isGenerating.value = false
  }
}

function deleteVideo(sceneId: string) {
  const scene = scenes.value.find(s => s.id === sceneId)
  if (scene) {
    scene.videoUrl = ''
    scene.videoStatus = 'pending'
    sceneProgress.value[sceneId] = 0
    ElMessage.success('视频已删除')
  }
}

function goBack() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard`)
}

function saveAndNext() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/voice-lipsync`)
}
</script>

<style scoped lang="scss">
.step-view { max-width: 1200px; }
.step-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.step-desc { font-size: 14px; color: #999; margin-bottom: 24px; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  label { font-size: 14px; color: #999; }
}

.video-settings {
  display: flex;
  gap: 8px;
}

.progress-section {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.progress-text {
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  color: #4CAF50;
  font-weight: 500;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.video-card {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(76, 175, 80, 0.3);
    transform: translateY(-2px);
  }
}

.video-preview {
  width: 100%;
  aspect-ratio: 9/16;
  border-radius: 8px;
  overflow: hidden;
  background: #111;
  
  video, img { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
  }
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #666;
  gap: 8px;

  &.queued { color: #FFA726; }
  &.generating { color: #4CAF50; }
  &.error { color: #F44336; }

  .el-icon {
    font-size: 24px;
  }
}

.video-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.video-label { 
  font-size: 14px; 
  font-weight: 600; 
  color: #4CAF50; 
}

.video-duration { 
  font-size: 12px; 
  color: #666;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.video-desc { 
  font-size: 13px; 
  color: #999; 
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-sm { 
  padding: 6px 14px; 
  font-size: 12px;
  
  &.btn-danger {
    color: #F44336;
    &:hover { background: rgba(244, 67, 54, 0.1); }
  }
}

.step-actions {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
