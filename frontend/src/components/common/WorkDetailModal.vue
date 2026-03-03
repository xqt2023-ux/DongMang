<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div class="modal-overlay" v-if="visible" @click.self="close">
        <div class="modal-content">
          <button class="modal-close" @click="close">✕</button>
          <div class="modal-body">
            <!-- 左侧视频 -->
            <div class="modal-video">
              <video
                ref="videoRef"
                :src="work.videoUrl"
                :poster="work.coverUrl"
                controls
                class="video-player"
              />
            </div>
            <!-- 右侧信息 -->
            <div class="modal-info">
              <div class="author-row">
                <img :src="work.authorAvatar" alt="" class="author-avatar" />
                <span class="author-name">{{ work.authorName }}</span>
              </div>
              <h2 class="work-title">{{ work.title }}</h2>
              <p class="work-date">{{ formatDate(work.createdAt) }}</p>

              <div class="info-section">
                <h4 class="info-label">故事类型</h4>
                <p class="info-value">{{ work.storyType }}</p>
              </div>

              <div class="info-section">
                <h4 class="info-label">故事梗概</h4>
                <p class="info-value summary">{{ work.summary }}</p>
              </div>

              <div class="info-section" v-if="work.roles.length > 0">
                <h4 class="info-label">故事主角</h4>
                <div class="roles-row">
                  <div class="role-thumb" v-for="role in work.roles" :key="role.id">
                    <img :src="role.avatarUrl" :alt="role.name" />
                  </div>
                </div>
              </div>

              <button class="btn-create" @click="handleCreate">
                ✨ 我要创作
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PublishedWork } from '@/types'

const props = defineProps<{
  visible: boolean
  work: PublishedWork
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const videoRef = ref<HTMLVideoElement>()

function close() {
  if (videoRef.value) {
    videoRef.value.pause()
  }
  emit('close')
}

function handleCreate() {
  close()
  // 创建新项目并进入编辑器
  const newId = Date.now().toString(36)
  router.push(`/editor/${newId}/global-settings`)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  width: 90vw;
  max-width: 1000px;
  max-height: 85vh;
  background: #1a1a1a;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #eaeaea;
  font-size: 18px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: background var(--motion-standard);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.modal-body {
  display: flex;
  height: 100%;
}

.modal-video {
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
}

.video-player {
  width: 100%;
  max-height: 75vh;
  outline: none;
}

.modal-info {
  width: 360px;
  min-width: 360px;
  padding: 28px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  font-size: 14px;
  color: #eaeaea;
  font-weight: 500;
}

.work-title {
  font-size: 22px;
  font-weight: 700;
  color: #eaeaea;
}

.work-date {
  font-size: 13px;
  color: #666666;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 13px;
  color: #4CAF50;
  font-weight: 600;
}

.info-value {
  font-size: 14px;
  color: #cccccc;
  line-height: 1.6;

  &.summary {
    max-height: 120px;
    overflow-y: auto;
  }
}

.roles-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.role-thumb {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.btn-create {
  margin-top: auto;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #4CAF50, #81C784);
  color: white;
  transition: all var(--motion-standard);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.35);
  }
}

// 动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--motion-standard);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
