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
        <button class="btn-secondary" @click="generateFromContent">
          📋 根据已有内容生成
        </button>
        <button class="btn-primary" @click="exportVideo">
          ⬇️ 导出视频
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 视频播放器 -->
      <div class="video-player-container">
        <div class="video-wrapper">
          <video
            ref="videoPlayer"
            class="video-player"
            :src="currentVideoUrl"
            @timeupdate="handleTimeUpdate"
            @loadedmetadata="handleLoadedMetadata"
            @play="isPlaying = true"
            @pause="isPlaying = false"
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
                v-for="(clip, index) in videoClips"
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
                v-for="(audio, index) in audioClips"
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
                v-for="(subtitle, index) in subtitleClips"
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
                v-for="(music, index) in musicClips"
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
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const projectTitle = ref('长坂坡-为爱决斗')
const videoPlayer = ref<HTMLVideoElement | null>(null)
const currentTime = ref(0)
const duration = ref(15) // 默认15秒
const isPlaying = ref(false)
const isMuted = ref(false)
const zoomLevel = ref(1)

// Mock 数据
const currentVideoUrl = ref('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')

const videoClips = ref([
  {
    id: '1',
    name: '场景1',
    startTime: 0,
    duration: 5,
    thumbnail: 'https://picsum.photos/seed/scene1/160/90',
  },
  {
    id: '2',
    name: '场景2',
    startTime: 5,
    duration: 5,
    thumbnail: 'https://picsum.photos/seed/scene2/160/90',
  },
  {
    id: '3',
    name: '场景3',
    startTime: 10,
    duration: 5,
    thumbnail: 'https://picsum.photos/seed/scene3/160/90',
  },
])

const audioClips = ref([
  {
    id: '1',
    speaker: '无配音',
    startTime: 0,
    duration: 15,
  },
])

const subtitleClips = ref([
  {
    id: '1',
    text: '王子声',
    startTime: 0,
    duration: 5,
  },
  {
    id: '2',
    text: '对话内容',
    startTime: 5,
    duration: 10,
  },
])

const musicClips = ref([
  {
    id: '1',
    name: '无背景音乐',
    startTime: 0,
    duration: 15,
  },
])

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
  ElMessage.info('根据已有内容生成功能开发中...')
}

function exportVideo() {
  ElMessage.success('开始导出视频...')
  // TODO: 实现导出功能
}

function goBack() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard-video`)
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
  transition: all 0.2s;

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
  gap: 12px;
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
  transition: transform 0.2s;
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
  transition: all 0.2s;

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
  transition: all 0.2s;
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
