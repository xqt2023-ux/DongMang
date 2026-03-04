<template>
  <div class="video-preview-view">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <div class="project-info">
        <button class="btn-back" @click="goBack">
          <span>← 返回</span>
        </button>
        <h2 class="project-title">{{ projectTitle }}</h2>
      </div>
      <div class="top-actions">
        <div class="service-status" :class="{ online: aiServiceOnline, offline: !aiServiceOnline }">
          <span class="status-dot"></span>
          <span>{{ aiServiceOnline ? 'AI服务在线' : 'AI服务离线' }}</span>
        </div>
        <button class="btn-secondary" @click="generateFromContent" :disabled="isSynthesizing || selectedSceneIds.length === 0">
          <span v-if="isSynthesizing">⏳ 合成中...</span>
          <span v-else>📋 根据已有内容生成</span>
        </button>
        <button class="btn-primary" @click="exportVideo" :disabled="isSynthesizing">
          ⬇️ 导出视频
        </button>
      </div>
    </div>

    <div class="synthesize-bar" v-if="synthesizeCandidates.length">
      <div class="synthesize-left">
        <span class="synthesize-title">合成分镜（{{ selectedSceneIds.length }}/{{ synthesizeCandidates.length }}）</span>
        <button class="btn-mini" @click="selectAllScenes">全选</button>
        <button class="btn-mini" @click="clearSelectedScenes">清空</button>
      </div>
      <div class="scene-pills">
        <button
          v-for="scene in synthesizeCandidates"
          :key="`synth-${scene.id}`"
          class="scene-pill"
          :class="{ active: selectedSceneIds.includes(scene.id) }"
          @click="toggleSelectedScene(scene.id)"
        >
          分镜{{ scene.order }}
        </button>
      </div>
    </div>

    <div v-if="!synthesizeCandidates.length" class="empty-synthesize-tip">
      <div class="tip-title">当前没有可合成的分镜视频</div>
      <div class="tip-desc">请先在第5步“分镜视频”中为分镜生成视频片段，再回到此页自动/手动合成成片。</div>
      <button class="btn-secondary" @click="goToStoryboardVideo">前往第5步生成分镜视频</button>
    </div>

    <div v-if="lastSynthesizeError" class="synthesize-error-tip">
      <div class="error-title">上次合成失败原因</div>
      <div class="error-desc">{{ lastSynthesizeError }}</div>
      <div class="error-actions">
        <button class="btn-mini" @click="generateFromContent" :disabled="isSynthesizing || selectedSceneIds.length === 0">重试合成</button>
        <button class="btn-mini" @click="goToStoryboardVideo">检查分镜视频</button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 视频播放器 -->
      <div class="video-player-container">
        <div class="video-wrapper">
          <video
            :key="videoElementKey"
            ref="videoPlayer"
            class="video-player"
            :src="playbackVideoUrl"
            @timeupdate="handleTimeUpdate"
            @loadedmetadata="handleLoadedMetadata"
            @play="isPlaying = true"
            @pause="isPlaying = false"
            @error="handleVideoPlaybackError"
          ></video>
          
          <!-- 播放控制 -->
          <div class="video-controls">
            <button class="control-btn" @click="togglePlay">
              <span v-if="isPlaying">⏸️</span>
              <span v-else>▶️</span>
            </button>
            <span class="time-display">{{ formatTime(currentTime) }}/{{ formatTime(duration) }}</span>
            <div class="progress-bar" @click="handleProgressClick">
              <div class="progress-filled" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <button class="control-btn" @click="toggleMute">
              <span v-if="isMuted">🔇</span>
              <span v-else>🔊</span>
            </button>
            <button class="control-btn" @click="toggleFullscreen">
              <span>⛶</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 时间轴编辑器 -->
      <div class="timeline-editor">
        <div class="timeline-header">
          <span class="timeline-title">时间轴</span>
          <div class="timeline-actions">
            <button class="btn-icon" title="放大"  @click="zoomIn">+</button>
            <button class="btn-icon" title="缩小" @click="zoomOut">-</button>
            <button class="btn-icon" title="适应窗口" @click="resetZoom">⊡</button>
          </div>
        </div>

        <!-- 时间刻度 -->
        <div class="timeline-ruler">
          <div class="ruler-markers">
            <div
              v-for="(mark, i) in timeMarkers"
              :key="i"
              class="ruler-mark"
              :style="{ left: (mark / duration * 100) + '%' }"
            >
              <span class="ruler-label">{{ formatTime(mark) }}</span>
            </div>
          </div>
          <!-- 播放头 -->
          <div class="playhead" :style="{ left: progressPercent + '%' }"></div>
        </div>

        <!-- 轨道区域 -->
        <div class="tracks-container">
          <!-- 视频轨道 -->
          <div class="track">
            <div class="track-label">视频</div>
            <div class="track-content">
              <div
                v-for="clip in videoClips"
                :key="clip.id"
                class="track-clip"
                :style="{
                  left: (clip.startTime / duration * 100) + '%',
                  width: (clip.duration / duration * 100) + '%',
                }"
                @click="selectClip(clip)"
              >
                <img v-if="clip.thumbnail" :src="clip.thumbnail" class="clip-thumbnail" />
                <span class="clip-label">{{ clip.name }}</span>
              </div>
            </div>
          </div>

          <!-- 配音轨道 -->
          <div class="track">
            <div class="track-label">配音</div>
            <div class="track-content">
              <div
                v-for="audio in audioClips"
                :key="audio.id"
                class="track-clip audio-clip"
                :style="{
                  left: (audio.startTime / duration * 100) + '%',
                  width: (audio.duration / duration * 100) + '%',
                }"
              >
                <span class="clip-label">🎤 {{ audio.speaker || '无配音' }}</span>
              </div>
            </div>
          </div>

          <!-- 字幕轨道 -->
          <div class="track">
            <div class="track-label">字幕</div>
            <div class="track-content">
              <div
                v-for="subtitle in subtitleClips"
                :key="subtitle.id"
                class="track-clip subtitle-clip"
                :style="{
                  left: (subtitle.startTime / duration * 100) + '%',
                  width: (subtitle.duration / duration * 100) + '%',
                }"
              >
                <span class="clip-label">💬 {{ subtitle.text }}</span>
              </div>
            </div>
          </div>

          <!-- 音乐轨道 -->
          <div class="track">
            <div class="track-label">音乐</div>
            <div class="track-content">
              <div
                v-for="music in musicClips"
                :key="music.id"
                class="track-clip music-clip"
                :style="{
                  left: (music.startTime / duration * 100) + '%',
                  width: (music.duration / duration * 100) + '%',
                }"
              >
                <span class="clip-label">🎵 {{ music.name || '无背景音乐' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/project'
import { aiService } from '@/services/ai'
import { assetService } from '@/services'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const projectTitle = computed(() => projectStore.currentProject?.title || '未命名项目')
const videoPlayer = ref<HTMLVideoElement | null>(null)
const currentTime = ref(0)
const duration = ref(15) // 默认15秒
const isPlaying = ref(false)
const isMuted = ref(false)
const zoomLevel = ref(1)
const isSynthesizing = ref(false)
const selectedSceneIds = ref<string[]>([])
const aiServiceOnline = ref(true)
const playbackVideoUrl = ref('')
const videoElementKey = ref(0)
const hasTriedDirectAiFallback = ref(false)
const autoSynthesizeTried = ref(false)
const lastSynthesizeError = ref('')
let healthTimer: ReturnType<typeof setInterval> | null = null

const currentVideoUrl = computed(() => projectStore.currentProject?.videoUrl || '')

const scenes = computed(() => projectStore.currentProject?.scenes ?? [])
const voiceTracks = computed(() => projectStore.currentProject?.voiceTracks ?? [])
const synthesizeCandidates = computed(() =>
  scenes.value
    .filter(scene => !!scene.videoUrl)
    .sort((a, b) => a.order - b.order),
)

onMounted(() => {
  syncSelectedSceneIds(true)
  void refreshPlaybackUrl(currentVideoUrl.value)
  if (!currentVideoUrl.value && synthesizeCandidates.value.length > 0 && !autoSynthesizeTried.value) {
    autoSynthesizeTried.value = true
    ElMessage.info('检测到已有分镜视频，正在自动合成成片...')
    void synthesizeFinalVideo()
  }
  void checkAiServiceHealth(false)
  healthTimer = setInterval(() => {
    void checkAiServiceHealth(true)
  }, 15000)
})

onBeforeUnmount(() => {
  if (healthTimer) {
    clearInterval(healthTimer)
    healthTimer = null
  }
})

watch(synthesizeCandidates, () => {
  syncSelectedSceneIds(false)
}, { deep: true })

watch(currentVideoUrl, (nextUrl) => {
  void refreshPlaybackUrl(nextUrl)
})

const videoClips = computed(() => {
  let cursor = 0
  return scenes.value.map((scene, index) => {
    const clip = {
      id: scene.id,
      name: `场景${index + 1}`,
      startTime: cursor,
      duration: scene.duration || 0,
      thumbnail: scene.thumbnailUrl || scene.imageUrl || '',
    }
    cursor += scene.duration || 0
    return clip
  })
})

const audioClips = computed(() => {
  if (voiceTracks.value.length === 0) {
    return [{ id: 'none', speaker: '无配音', startTime: 0, duration: duration.value }]
  }
  return voiceTracks.value.map((track) => ({
    id: track.id,
    speaker: track.roleId || '旁白',
    startTime: track.startTime || 0,
    duration: track.duration || 0,
  }))
})

const subtitleClips = computed(() => {
  let cursor = 0
  return scenes.value
    .filter((scene) => scene.narration)
    .map((scene) => {
      const clip = {
        id: scene.id,
        text: scene.narration,
        startTime: cursor,
        duration: scene.duration || 0,
      }
      cursor += scene.duration || 0
      return clip
    })
})

const musicClips = computed(() => {
  const audioTrack = projectStore.currentProject?.audioTrack
  if (!audioTrack) {
    return [{ id: 'music-none', name: '无背景音乐', startTime: 0, duration: duration.value }]
  }
  return [{
    id: audioTrack.id,
    name: audioTrack.name || '背景音乐',
    startTime: 0,
    duration: audioTrack.duration || duration.value,
  }]
})

const progressPercent = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
})

const timeMarkers = computed(() => {
  const markers = []
  const step = Math.max(1, Math.ceil(duration.value / 10))
  for (let i = 0; i <= duration.value; i += step) {
    markers.push(i)
  }
  return markers
})

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function togglePlay() {
  if (!videoPlayer.value) return
  if (isPlaying.value) {
    videoPlayer.value.pause()
  } else {
    videoPlayer.value.play()
  }
}

function toggleMute() {
  if (!videoPlayer.value) return
  videoPlayer.value.muted = !videoPlayer.value.muted
  isMuted.value = videoPlayer.value.muted
}

function toggleFullscreen() {
  if (!videoPlayer.value) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    videoPlayer.value.requestFullscreen()
  }
}

function handleTimeUpdate() {
  if (videoPlayer.value) {
    currentTime.value = videoPlayer.value.currentTime
  }
}

function handleLoadedMetadata() {
  if (videoPlayer.value) {
    duration.value = videoPlayer.value.duration || 15
  }
}

function handleVideoPlaybackError() {
  const rawUrl = currentVideoUrl.value
  if (!hasTriedDirectAiFallback.value && rawUrl && rawUrl.startsWith('/ai/')) {
    hasTriedDirectAiFallback.value = true
    playbackVideoUrl.value = `http://localhost:8000${rawUrl}`
    videoElementKey.value += 1
    ElMessage.warning('代理播放失败，已自动切换为直连 AI 服务地址重试')
    return
  }
  ElMessage.error('视频已生成但无法播放：请检查 AI 服务是否在线，或重新合成')
}

function normalizeVideoUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  if (rawUrl.startsWith('//')) return `${window.location.protocol}${rawUrl}`
  return new URL(rawUrl, window.location.origin).toString()
}

function inferVideoExt(url: string): 'mp4' | 'webm' | 'mov' {
  const lower = (url || '').toLowerCase()
  if (lower.includes('.webm')) return 'webm'
  if (lower.includes('.mov')) return 'mov'
  return 'mp4'
}

function toPersistableVideoSource(rawUrl: string): string {
  if (!rawUrl) return ''
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  if (rawUrl.startsWith('/ai/')) return normalizeVideoUrl(rawUrl)
  return normalizeVideoUrl(rawUrl)
}

async function persistFinalVideoUrl(rawUrl: string, projectId: string): Promise<string> {
  if (!rawUrl || rawUrl.startsWith('/api/assets/')) return rawUrl

  const sourceUrl = toPersistableVideoSource(rawUrl)
  const ext = inferVideoExt(sourceUrl)
  const filename = `final-${projectId || 'project'}-${Date.now()}.${ext}`

  try {
    const asset = await assetService.importAssetFromUrl(sourceUrl, filename)
    return asset.contentUrl
  } catch (error: any) {
    console.warn('成片视频转存资产失败，将暂时使用原链接:', error)
    ElMessage.warning('成片已生成，但持久化失败，当前将暂时使用原始链接')
    return rawUrl
  }
}

async function canAccessVideo(url: string): Promise<boolean> {
  if (!url) return false
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

async function refreshPlaybackUrl(rawUrl: string) {
  hasTriedDirectAiFallback.value = false

  if (!rawUrl) {
    playbackVideoUrl.value = ''
    return
  }

  const normalized = normalizeVideoUrl(rawUrl)
  const sameOriginReachable = await canAccessVideo(normalized)
  if (sameOriginReachable) {
    playbackVideoUrl.value = normalized
    videoElementKey.value += 1
    return
  }

  if (rawUrl.startsWith('/ai/')) {
    const directAiUrl = `http://localhost:8000${rawUrl}`
    const directReachable = await canAccessVideo(directAiUrl)
    if (directReachable) {
      playbackVideoUrl.value = directAiUrl
      videoElementKey.value += 1
      return
    }
  }

  playbackVideoUrl.value = normalized
  videoElementKey.value += 1
}

function handleProgressClick(event: MouseEvent) {
  if (!videoPlayer.value) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  videoPlayer.value.currentTime = percent * duration.value
}

function selectClip(clip: any) {
  console.log('Selected clip:', clip)
  ElMessage.info(`已选中: ${clip.name}`)
}

function zoomIn() {
  zoomLevel.value = Math.min(3, zoomLevel.value + 0.2)
}

function zoomOut() {
  zoomLevel.value = Math.max(0.5, zoomLevel.value - 0.2)
}

function resetZoom() {
  zoomLevel.value = 1
}

function generateFromContent() {
  void synthesizeFinalVideo()
}

function syncSelectedSceneIds(forceAll: boolean) {
  const availableIds = synthesizeCandidates.value.map(scene => scene.id)
  if (forceAll || selectedSceneIds.value.length === 0) {
    selectedSceneIds.value = availableIds
    return
  }

  const availableSet = new Set(availableIds)
  selectedSceneIds.value = selectedSceneIds.value.filter(id => availableSet.has(id))
}

function toggleSelectedScene(sceneId: string) {
  if (selectedSceneIds.value.includes(sceneId)) {
    selectedSceneIds.value = selectedSceneIds.value.filter(id => id !== sceneId)
    return
  }
  selectedSceneIds.value = [...selectedSceneIds.value, sceneId]
}

function selectAllScenes() {
  selectedSceneIds.value = synthesizeCandidates.value.map(scene => scene.id)
}

function clearSelectedScenes() {
  selectedSceneIds.value = []
}

async function checkAiServiceHealth(silent: boolean) {
  try {
    const response = await fetch('/ai/video/health', { method: 'GET' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    aiServiceOnline.value = true
  } catch {
    const wasOnline = aiServiceOnline.value
    aiServiceOnline.value = false
    if (!silent || wasOnline) {
      ElMessage.warning('AI服务离线：请确认 ai-service 已启动（端口 8000）')
    }
  }
}

function triggerVideoDownload(url: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${projectTitle.value || 'dongmang'}-final.mp4`
  anchor.target = '_blank'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  ElMessage.success('已开始导出视频')
}

async function exportVideo() {
  const existingUrl = playbackVideoUrl.value || currentVideoUrl.value
  if (existingUrl) {
    const normalizedUrl = normalizeVideoUrl(existingUrl)
    const reachable = await canAccessVideo(normalizedUrl)
    if (reachable) {
      triggerVideoDownload(normalizedUrl)
      return
    }

    const rawProjectVideoUrl = currentVideoUrl.value
    if (rawProjectVideoUrl?.startsWith('/ai/')) {
      const directAiUrl = `http://localhost:8000${rawProjectVideoUrl}`
      const directReachable = await canAccessVideo(directAiUrl)
      if (directReachable) {
        triggerVideoDownload(directAiUrl)
        return
      }
    }

    ElMessage.warning('当前成片链接不可访问，正在自动重新合成并导出...')
  }

  if (synthesizeCandidates.value.length === 0) {
    ElMessage.warning('当前没有可导出的分镜视频，请先在第5步生成分镜视频')
    return
  }

  ElMessage.info('未检测到成片，正在自动合成并导出...')
  const generatedUrl = await synthesizeFinalVideo()
  if (generatedUrl) {
    triggerVideoDownload(generatedUrl)
  }
}

function goBack() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard-video`)
}

function goToStoryboardVideo() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard-video`)
}

async function synthesizeFinalVideo(): Promise<string | null> {
  if (isSynthesizing.value) return null

  const project = projectStore.currentProject
  if (!project) {
    ElMessage.warning('未找到当前项目')
    return null
  }

  const selectedSet = new Set(selectedSceneIds.value)
  const sceneClips = (project.scenes || [])
    .filter(scene => !!scene.videoUrl && selectedSet.has(scene.id))
    .map(scene => ({
      order: scene.order,
      videoUrl: scene.videoUrl,
      duration: scene.duration,
    }))
    .sort((a, b) => a.order - b.order)

  if (sceneClips.length === 0) {
    ElMessage.warning('当前没有可合成的分镜视频，请先在第5步生成分镜视频')
    return null
  }

  isSynthesizing.value = true
  lastSynthesizeError.value = ''
  ElMessage.info(`开始合成 ${sceneClips.length} 段分镜视频...`)

  try {
    const result = await aiService.synthesizeVideo({
      projectId: project.id,
      scenes: sceneClips,
    })

    if (!result.videoUrl) {
      throw new Error('后端未返回成片地址')
    }

    const persistentVideoUrl = await persistFinalVideoUrl(result.videoUrl, project.id)
    project.videoUrl = persistentVideoUrl
    await projectStore.saveCurrentProject()
    await refreshPlaybackUrl(project.videoUrl)
    const finalPlayableUrl = playbackVideoUrl.value || project.videoUrl

    if (videoPlayer.value) {
      videoPlayer.value.load()
    }
    if (result.warning || (result.skippedClips && result.skippedClips.length > 0)) {
      const skippedCount = result.skippedClips?.length || 0
      ElMessage.warning(result.warning || `已合成成功，但跳过了 ${skippedCount} 段失效分镜视频`)
    } else {
      ElMessage.success('已根据已有内容生成成片')
    }
    return finalPlayableUrl
  } catch (error: any) {
    const message = error?.message || '合成失败，请稍后重试'
    if (message.includes('Not Found')) {
      lastSynthesizeError.value = 'AI服务未启动或版本过旧，请重启 ai-service 后重试。'
    } else if (message.includes('ffmpeg')) {
      lastSynthesizeError.value = '服务端未安装 ffmpeg 或未加入 PATH，导致无法合成视频。'
    } else if (message.includes('没有可合成')) {
      lastSynthesizeError.value = '当前没有可合成分镜视频，请先到第5步生成分镜视频。'
    } else {
      lastSynthesizeError.value = message
    }
    if (message.includes('Not Found')) {
      ElMessage.error('合成失败：AI服务未启动或仍是旧版本，请重启 ai-service 后重试')
    } else
    if (message.includes('ffmpeg')) {
      ElMessage.error('合成失败：服务端未安装 ffmpeg，请先安装并加入 PATH')
    } else {
      ElMessage.error(message)
    }
    return null
  } finally {
    isSynthesizing.value = false
  }
}
</script>

<style scoped lang="scss">
.video-preview-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0a0a;
  color: #fff;
  overflow: hidden;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #1a1a1a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--motion-standard);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.project-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.service-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: #aeb7c2;

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
  }

  &.online {
    color: #d6ffd0;
    border-color: rgba(76, 175, 80, 0.45);
    background: rgba(76, 175, 80, 0.16);

    .status-dot {
      background: #4caf50;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.7);
    }
  }

  &.offline {
    color: #ffb4b4;
    border-color: rgba(255, 92, 92, 0.45);
    background: rgba(255, 92, 92, 0.14);

    .status-dot {
      background: #ff5c5c;
      box-shadow: 0 0 8px rgba(255, 92, 92, 0.6);
    }
  }
}

.synthesize-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 24px;
  background: #151719;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.empty-synthesize-tip {
  margin: 12px 24px 0;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 181, 84, 0.45);
  background: rgba(255, 181, 84, 0.12);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .tip-title {
    color: #f4c06a;
    font-size: 13px;
    font-weight: 700;
  }

  .tip-desc {
    color: #d9c6a4;
    font-size: 12px;
    flex: 1;
    min-width: 260px;
  }
}

.synthesize-error-tip {
  margin: 10px 24px 0;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 102, 102, 0.45);
  background: rgba(255, 102, 102, 0.12);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .error-title {
    color: #ff9a9a;
    font-size: 13px;
    font-weight: 700;
  }

  .error-desc {
    color: #ffd0d0;
    font-size: 12px;
    flex: 1;
    min-width: 260px;
  }

  .error-actions {
    display: inline-flex;
    gap: 8px;
  }
}

.synthesize-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.synthesize-title {
  font-size: 13px;
  color: #d5dce3;
  margin-right: 4px;
}

.btn-mini {
  padding: 4px 8px;
  font-size: 12px;
  color: #c9d0d8;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  cursor: pointer;
}

.scene-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.scene-pill {
  padding: 5px 10px;
  font-size: 12px;
  color: #a9b2bc;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 999px;
  cursor: pointer;

  &.active {
    color: #d6ffd0;
    border-color: rgba(76, 175, 80, 0.7);
    background: rgba(76, 175, 80, 0.18);
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.video-player-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  padding: 20px;
  min-height: 0;
}

.video-wrapper {
  position: relative;
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  max-height: 100%;
}

.video-player {
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 8px;
}

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.control-btn {
  padding: 8px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: transform var(--motion-standard);
  flex-shrink: 0;

  &:hover {
    transform: scale(1.1);
  }
}

.time-display {
  font-size: 14px;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  min-width: 0;
}

.progress-filled {
  height: 100%;
  background: #4CAF50;
  border-radius: 3px;
  transition: width 0.1s linear;
}

.timeline-editor {
  height: 280px;
  background: #1a1a1a;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.timeline-title {
  font-weight: 600;
  font-size: 14px;
}

.timeline-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
}

.timeline-ruler {
  position: relative;
  height: 30px;
  background: #0f0f0f;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.ruler-markers {
  position: relative;
  height: 100%;
}

.ruler-mark {
  position: absolute;
  top: 0;
  height: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  padding-left: 4px;
}

.ruler-label {
  font-size: 10px;
  color: #999;
}

.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: #4CAF50;
  pointer-events: none;
  z-index: 10;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -4px;
    width: 10px;
    height: 10px;
    background: #4CAF50;
    border-radius: 50%;
  }
}

.tracks-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.track {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  min-height: 50px;
  flex-shrink: 0;
}

.track-label {
  width: 80px;
  padding: 12px;
  background: #151515;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.track-content {
  flex: 1;
  position: relative;
  background: #0a0a0a;
  min-width: 0;
}

.track-clip {
  position: absolute;
  top: 5px;
  height: 40px;
  background: rgba(76, 175, 80, 0.3);
  border: 1px solid #4CAF50;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
  transition: all var(--motion-standard);

  &:hover {
    background: rgba(76, 175, 80, 0.5);
    transform: translateY(-2px);
    z-index: 5;
  }

  &.audio-clip {
    background: rgba(33, 150, 243, 0.3);
    border-color: #2196F3;

    &:hover {
      background: rgba(33, 150, 243, 0.5);
    }
  }

  &.subtitle-clip {
    background: rgba(255, 152, 0, 0.3);
    border-color: #FF9800;

    &:hover {
      background: rgba(255, 152, 0, 0.5);
    }
  }

  &.music-clip {
    background: rgba(156, 39, 176, 0.3);
    border-color: #9C27B0;

    &:hover {
      background: rgba(156, 39, 176, 0.5);
    }
  }
}

.clip-thumbnail {
  height: 100%;
  width: auto;
  margin-right: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.clip-label {
  font-size: 11px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-secondary, .btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--motion-standard);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
}

.btn-primary {
  background: #4CAF50;
  color: white;

  &:hover {
    background: #45a049;
  }
}
</style>
