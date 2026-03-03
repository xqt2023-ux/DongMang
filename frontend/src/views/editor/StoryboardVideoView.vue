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
        <div
          v-if="scene.videoUrl && videoValidity[scene.id] === 'checking'"
          class="video-url-checking"
        >
          正在校验历史视频可用性...
        </div>
        <div
          v-else-if="scene.videoUrl && videoValidity[scene.id] === 'invalid'"
          class="video-url-warning"
        >
          <span>{{ videoValidationMsg[scene.id] || '上次生成的视频链接已失效' }}</span>
          <button class="btn-ghost btn-xs" @click="regenerateInvalidVideo(scene.id)">一键重生成</button>
        </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification, ElIcon } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { aiService } from '@/services/ai'
import { assetService } from '@/services'
import { useProjectStore } from '@/stores/project'
import type { Scene, VideoGenStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const selectedModel = ref('doubao-seedance-1-5-pro')
const resolution = ref<'480P' | '720P' | '1080P'>('720P')
const aspectRatio = ref<'1:1' | '16:9' | '9:16'>('9:16')
const isGenerating = ref(false)
const isGeneratingSingle = ref<Record<string, boolean>>({})
const sceneProgress = ref<Record<string, number>>({})
const videoValidity = ref<Record<string, 'unknown' | 'checking' | 'valid' | 'invalid'>>({})
const videoValidationMsg = ref<Record<string, string>>({})

const scenes = ref<Scene[]>([])

onMounted(() => {
  const project = projectStore.currentProject
  if (!project) return
  scenes.value = (project.scenes || []).map((scene) => ({ ...scene }))
  void validateAllPersistedVideos()
})

watch(scenes, (value) => {
  const project = projectStore.currentProject
  if (!project) return
  project.scenes = value
}, { deep: true })

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

    const persistentVideoUrl = await persistRemoteVideo(scene, videoUrl)
    scene.videoUrl = persistentVideoUrl
    scene.videoStatus = 'generated'
    sceneProgress.value[sceneId] = 100
    videoValidity.value[sceneId] = persistentVideoUrl === videoUrl ? 'unknown' : 'valid'
    delete videoValidationMsg.value[sceneId]

    await persistVideoState('分镜视频已保存')

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

async function persistRemoteVideo(scene: Scene, remoteUrl: string): Promise<string> {
  if (!remoteUrl) return remoteUrl
  if (remoteUrl.startsWith('/api/assets/')) return remoteUrl

  try {
    const ext = inferVideoExt(remoteUrl)
    const filename = `scene-${scene.order || scene.id}-${Date.now()}.${ext}`
    const asset = await assetService.importAssetFromUrl(remoteUrl, filename)
    return asset.contentUrl
  } catch (error: any) {
    console.warn('分镜视频转存资产失败，将暂时使用远程链接:', error)
    videoValidationMsg.value[scene.id] = '视频已生成，但持久化失败，建议点击“重新生成”重试'
    return remoteUrl
  }
}

function inferVideoExt(url: string): 'mp4' | 'webm' | 'mov' {
  const lower = url.toLowerCase()
  if (lower.includes('.webm')) return 'webm'
  if (lower.includes('.mov')) return 'mov'
  return 'mp4'
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

    await persistVideoState()
    
    ElNotification.success({
      title: '批量生成完成',
      message: `成功生成 ${completedCount.value} 个视频`,
      duration: 5000,
    })
  } finally {
    isGenerating.value = false
  }
}

async function deleteVideo(sceneId: string) {
  const scene = scenes.value.find(s => s.id === sceneId)
  if (scene) {
    scene.videoUrl = ''
    scene.videoStatus = 'pending'
    sceneProgress.value[sceneId] = 0
    videoValidity.value[sceneId] = 'unknown'
    delete videoValidationMsg.value[sceneId]
    await persistVideoState()
    ElMessage.success('视频已删除')
  }
}

async function regenerateInvalidVideo(sceneId: string) {
  const scene = scenes.value.find(s => s.id === sceneId)
  if (!scene) return
  if (!scene.imageUrl) {
    ElMessage.warning('该分镜缺少分镜图，无法重生成视频')
    return
  }
  scene.videoUrl = ''
  scene.videoStatus = 'pending'
  videoValidity.value[sceneId] = 'unknown'
  delete videoValidationMsg.value[sceneId]
  await persistVideoState()
  await generateVideo(sceneId)
}

async function validateAllPersistedVideos() {
  const targets = scenes.value.filter(scene => !!scene.videoUrl)
  if (targets.length === 0) return

  for (const scene of targets) {
    await validateSceneVideo(scene)
  }
}

async function validateSceneVideo(scene: Scene) {
  if (!scene.videoUrl) return

  const sceneId = scene.id
  videoValidity.value[sceneId] = 'checking'
  const ok = await canLoadVideo(scene.videoUrl)

  if (ok) {
    videoValidity.value[sceneId] = 'valid'
    delete videoValidationMsg.value[sceneId]
  } else {
    videoValidity.value[sceneId] = 'invalid'
    videoValidationMsg.value[sceneId] = '上次生成的视频链接已失效，请一键重生成'
  }
}

function canLoadVideo(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    let done = false

    const finish = (result: boolean) => {
      if (done) return
      done = true
      clearTimeout(timer)
      video.onloadedmetadata = null
      video.oncanplay = null
      video.onerror = null
      resolve(result)
    }

    const timer = window.setTimeout(() => finish(false), 10000)

    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => finish(true)
    video.oncanplay = () => finish(true)
    video.onerror = () => finish(false)
    video.src = url
  })
}

async function goBack() {
  await persistVideoState()
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard`)
}

async function saveAndNext() {
  await persistVideoState('分镜视频状态已保存')
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/voice-lipsync`)
}

async function persistVideoState(successMessage?: string) {
  const project = projectStore.currentProject
  if (!project) return
  try {
    project.scenes = scenes.value
    await projectStore.saveCurrentProject()
    if (successMessage) ElMessage.success(successMessage)
  } catch (error: any) {
    console.error('保存分镜视频状态失败:', error)
    ElMessage.error(error?.message || '保存分镜视频状态失败')
  }
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
  transition: all var(--motion-standard);

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
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-url-checking {
  font-size: 12px;
  color: #a5adb8;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 8px 10px;
}

.video-url-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #ffc069;
  background: rgba(255, 183, 77, 0.08);
  border: 1px solid rgba(255, 183, 77, 0.28);
  border-radius: 8px;
  padding: 8px 10px;
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
