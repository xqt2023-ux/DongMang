<template>
  <div class="my-works-page">
    <div class="page-header">
      <h1>我的作品</h1>
      <button class="btn-new" @click="createNew">✨ 新建项目</button>
    </div>

    <div class="works-list" v-if="projects.length">
      <div class="work-item" v-for="p in projects" :key="p.id">
        <div class="item-cover">
          <img :src="p.coverUrl || defaultCover" :alt="p.title" />
          <span class="item-status" :class="p.status">{{ statusLabel(p.status) }}</span>
        </div>
        <div class="item-info">
          <h3>{{ p.title || '未命名项目' }}</h3>
          <p class="item-meta">
            {{ p.globalSettings?.storyType || '未设定类型' }} · 更新于 {{ formatTime(p.updatedAt) }}
          </p>
          <p class="item-summary">{{ p.globalSettings?.tone || '暂无简介' }}</p>
        </div>
        <div class="item-actions">
          <button class="btn-ghost" @click="editProject(p.id)">编辑</button>
          <button class="btn-ghost danger" @click="deleteProject(p.id)">删除</button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <div class="empty-icon">📝</div>
      <p>还没有项目，点击上方"新建项目"开始创作</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Project } from '@/types'

const router = useRouter()
const defaultCover = 'https://picsum.photos/seed/default-cover/400/300'

// 示例数据
const projects = ref<Project[]>([
  {
    id: 'p1',
    title: '霍去病传奇',
    description: '古代英雄传奇',
    globalSettings: {
      storyType: '古代英雄传奇',
      animeStyle: 'chinese',
      aspectRatio: '16:9',
      tone: '讲述汉朝名将霍去病的传奇故事',
    },
    script: '',
    scenes: [],
    roles: [],
    props: [],
    sceneBackgrounds: [],
    voiceTracks: [],
    coverUrl: 'https://picsum.photos/seed/mp1/400/300',
    videoUrl: '',
    shareToken: '',
    status: 'draft',
    createdAt: '2026-02-04T16:00:00+08:00',
    updatedAt: '2026-02-05T10:30:00+08:00',
  },
  {
    id: 'p2',
    title: '循环终章',
    description: '死亡重置悬疑故事',
    globalSettings: {
      storyType: '死亡重置',
      animeStyle: 'japanese',
      aspectRatio: '9:16',
      tone: '被困在死亡循环中的少年，寻找打破循环的真相',
    },
    script: '第一集：觉醒\n林昼再次在 6 月 17 日的清晨醒来...',
    scenes: [],
    roles: [],
    props: [],
    sceneBackgrounds: [],
    voiceTracks: [],
    coverUrl: 'https://picsum.photos/seed/mp2/400/300',
    videoUrl: 'https://example.com/video.mp4',
    shareToken: 'xyz',
    status: 'published',
    createdAt: '2026-02-03T12:00:00+08:00',
    updatedAt: '2026-02-04T18:00:00+08:00',
  },
])

function createNew() {
  const newId = Date.now().toString(36)
  router.push(`/editor/${newId}/global-settings`)
}

function editProject(id: string) {
  router.push(`/editor/${id}/global-settings`)
}

function deleteProject(id: string) {
  projects.value = projects.value.filter(p => p.id !== id)
}

function statusLabel(status: string) {
  return status === 'published' ? '已发布' : '草稿'
}

function formatTime(time: string) {
  const d = new Date(time)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.my-works-page {
  min-height: 100%;
  overflow-y: auto;
  padding: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h1 { font-size: 28px; font-weight: 700; color: #eaeaea; }
}

.btn-new {
  background: linear-gradient(135deg, #4CAF50, #81C784);
  border: none;
  color: white;
  padding: 10px 28px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.35);
  }
}

.works-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.work-item {
  display: flex;
  gap: 20px;
  background: #1a1a1a;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.3s;
  align-items: center;

  &:hover {
    border-color: rgba(76, 175, 80, 0.15);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
}

.item-cover {
  position: relative;
  width: 160px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.item-status {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 600;

  &.draft {
    background: rgba(255, 152, 0, 0.2);
    color: #ff9800;
  }
  &.published {
    background: rgba(76, 175, 80, 0.2);
    color: #4CAF50;
  }
}

.item-info {
  flex: 1;
  min-width: 0;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #eaeaea;
    margin-bottom: 6px;
  }
}

.item-meta {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.item-summary {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-ghost {
  background: transparent;
  border: 1px solid #444;
  color: #ccc;
  padding: 6px 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #4CAF50;
    color: #4CAF50;
  }

  &.danger:hover {
    border-color: #f44336;
    color: #f44336;
  }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #888;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  p { font-size: 15px; }
}
</style>
