<template>
  <div class="assets-page">
    <div class="page-header">
      <h1>资产库</h1>
      <button class="btn-upload">📁 上传资产</button>
    </div>

    <div class="assets-tabs">
      <span
        class="tab"
        :class="{ active: activeTab === tab.key }"
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
      >{{ tab.label }} ({{ getCount(tab.key) }})</span>
    </div>

    <div class="assets-grid" v-if="filteredAssets.length">
      <div class="asset-card" v-for="asset in filteredAssets" :key="asset.id">
        <div class="asset-preview">
          <img v-if="asset.type === 'image'" :src="asset.url" :alt="asset.name" />
          <div v-else-if="asset.type === 'audio'" class="audio-preview">
            <span class="audio-icon">🎵</span>
          </div>
          <div v-else-if="asset.type === 'video'" class="video-preview">
            <span class="video-icon">🎬</span>
          </div>
          <div v-else class="file-preview">
            <span class="file-icon">📄</span>
          </div>
        </div>
        <div class="asset-info">
          <span class="asset-name">{{ asset.name }}</span>
          <span class="asset-size">{{ asset.size }}</span>
        </div>
        <div class="asset-actions">
          <button class="btn-mini" title="下载">⬇</button>
          <button class="btn-mini danger" title="删除" @click="deleteAsset(asset.id)">🗑</button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <div class="empty-icon">📦</div>
      <p>暂无{{ currentTabLabel }}资产</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Asset, AssetType } from '@/types'

const activeTab = ref<AssetType | 'all'>('all')

const tabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'image' as AssetType, label: '图片' },
  { key: 'audio' as AssetType, label: '音频' },
  { key: 'video' as AssetType, label: '视频' },
]

const currentTabLabel = computed(() => {
  return tabs.find(t => t.key === activeTab.value)?.label || ''
})

// 示例数据
const assets = ref<Asset[]>([
  { id: '1', name: '角色_霍去病.png', type: 'image', url: 'https://picsum.photos/seed/asset1/200/200', size: '1.2 MB', projectId: 'p1', createdAt: '2026-02-04T10:00:00' },
  { id: '2', name: '场景_大漠.png', type: 'image', url: 'https://picsum.photos/seed/asset2/200/200', size: '2.4 MB', projectId: 'p1', createdAt: '2026-02-04T10:05:00' },
  { id: '3', name: 'BGM_战斗.mp3', type: 'audio', url: '', size: '4.8 MB', projectId: 'p1', createdAt: '2026-02-04T10:10:00' },
  { id: '4', name: '角色_林昼.png', type: 'image', url: 'https://picsum.photos/seed/asset3/200/200', size: '1.1 MB', projectId: 'p2', createdAt: '2026-02-04T11:00:00' },
  { id: '5', name: '片段_01.mp4', type: 'video', url: '', size: '12.3 MB', projectId: 'p2', createdAt: '2026-02-04T12:00:00' },
  { id: '6', name: '旁白_第一幕.mp3', type: 'audio', url: '', size: '2.1 MB', projectId: 'p2', createdAt: '2026-02-04T12:30:00' },
])

function getCount(key: string) {
  if (key === 'all') return assets.value.length
  return assets.value.filter(a => a.type === key).length
}

const filteredAssets = computed(() => {
  if (activeTab.value === 'all') return assets.value
  return assets.value.filter(a => a.type === activeTab.value)
})

function deleteAsset(id: string) {
  assets.value = assets.value.filter(a => a.id !== id)
}
</script>

<style scoped lang="scss">
.assets-page {
  min-height: 100%;
  overflow-y: auto;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 { font-size: 28px; font-weight: 700; color: #eaeaea; }
}

.btn-upload {
  background: #1a1a1a;
  border: 1px dashed #555;
  color: #ccc;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #4CAF50;
    color: #4CAF50;
  }
}

.assets-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
}

.tab {
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 13px;
  color: #aaa;
  cursor: pointer;
  background: #1a1a1a;
  transition: all 0.2s;

  &:hover { color: #eaeaea; }
  &.active {
    background: rgba(76, 175, 80, 0.15);
    color: #4CAF50;
  }
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.asset-card {
  background: #1a1a1a;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.3s;

  &:hover {
    border-color: rgba(76, 175, 80, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
}

.asset-preview {
  aspect-ratio: 1;
  overflow: hidden;
  background: #111;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.audio-preview, .video-preview, .file-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  background: linear-gradient(135deg, #1a1a1a, #222);
}

.asset-info {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.asset-name {
  font-size: 12px;
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.asset-size {
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
  margin-left: 8px;
}

.asset-actions {
  padding: 0 12px 10px;
  display: flex;
  gap: 6px;
}

.btn-mini {
  background: transparent;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;

  &:hover { border-color: #4CAF50; }
  &.danger:hover { border-color: #f44336; }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #888;

  .empty-icon { font-size: 48px; margin-bottom: 16px; }
  p { font-size: 15px; }
}
</style>
