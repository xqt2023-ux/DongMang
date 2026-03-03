<template>
  <div class="assets-page">
    <div class="assets-shell">
      <aside class="folder-panel">
        <div class="panel-title">个人资产库</div>
        <div class="tree-group">
          <div class="tree-group-title">素材库</div>
          <button
            v-for="folder in folders"
            :key="folder.key"
            class="tree-item"
            :class="{ active: activeFolder === folder.key }"
            @click="activeFolder = folder.key"
          >
            <span class="tree-icon">📁</span>
            <span class="tree-text">{{ folder.label }}</span>
            <span class="tree-count">{{ getCount(folder.key) }}</span>
          </button>
        </div>
      </aside>

      <main class="library-panel">
        <div class="library-header">
          <div>
            <h1>道具库</h1>
            <p class="library-path">个人资产库 > 素材库 > {{ currentFolderLabel }}</p>
          </div>
          <button class="btn-new-folder" @click="createFolder">+ 新建文件夹</button>
        </div>

        <div class="assets-grid">
          <button class="upload-tile" @click="triggerUpload">
            <span class="plus">＋</span>
            <span>上传道具图</span>
          </button>

          <div class="asset-card" v-for="asset in filteredAssets" :key="asset.id">
            <span class="asset-tag">精选</span>
            <div class="asset-preview">
              <img v-if="asset.type === 'image'" :src="asset.url" :alt="asset.name" />
              <div v-else-if="asset.type === 'audio'" class="audio-preview">🎵</div>
              <div v-else-if="asset.type === 'video'" class="video-preview">🎬</div>
              <div v-else class="file-preview">📄</div>
            </div>
            <div class="asset-info">
              <span class="asset-name">{{ asset.name }}</span>
              <span class="asset-time">{{ formatDate(asset.createdAt) }}</span>
            </div>
            <div class="asset-actions">
              <button
                class="btn-mini"
                title="下载"
                :disabled="!asset.downloadUrl"
                @click="downloadAsset(asset)"
              >⬇</button>
              <button class="btn-mini danger" title="删除" @click="deleteAsset(asset.id)">🗑</button>
            </div>
          </div>
        </div>

        <div class="empty-state" v-if="!filteredAssets.length">
          <div class="empty-icon">📦</div>
          <p>当前文件夹暂无素材</p>
        </div>
      </main>
    </div>

    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*,audio/*,video/*"
      class="file-input"
      @change="handleUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { assetService } from '@/services'

type LocalAssetType = 'image' | 'audio' | 'video' | 'file'
type ImageCategory = 'role' | 'scene' | 'prop' | 'unknown'
type FolderKey = 'all' | 'props' | 'roles' | 'scenes' | 'audio' | 'video' | 'files'

interface LocalAsset {
  id: string
  name: string
  type: LocalAssetType
  imageCategory: ImageCategory
  url: string
  downloadUrl: string
  size: string
  createdAt: string
}

const activeFolder = ref<FolderKey>('props')
const fileInput = ref<HTMLInputElement | null>(null)

const folders: Array<{ key: FolderKey; label: string }> = [
  { key: 'all', label: '全部素材' },
  { key: 'props', label: '道具库' },
  { key: 'roles', label: '角色库' },
  { key: 'scenes', label: '场景库' },
  { key: 'audio', label: '音频库' },
  { key: 'video', label: '视频库' },
  { key: 'files', label: '文件库' },
]

const currentFolderLabel = computed(() => {
  return folders.find(t => t.key === activeFolder.value)?.label || ''
})

const assets = ref<LocalAsset[]>([])

onMounted(async () => {
  const list = await assetService.listAssets()
  assets.value = list.map((item) => ({
    id: item.id,
    name: item.name,
    type: getAssetTypeByMime(item.mimeType),
    imageCategory: getImageCategory(item.name, item.mimeType),
    url: item.contentUrl,
    downloadUrl: item.downloadUrl,
    size: formatFileSize(item.size),
    createdAt: item.createdAt,
  }))
})

function getCount(key: string) {
  if (key === 'all') return assets.value.length
  return assets.value.filter(a => belongsToFolder(a, key as FolderKey)).length
}

const filteredAssets = computed(() => {
  if (activeFolder.value === 'all') return assets.value
  return assets.value.filter(a => belongsToFolder(a, activeFolder.value))
})

function deleteAsset(id: string) {
  assetService.deleteAsset(id).then(() => {
    assets.value = assets.value.filter(a => a.id !== id)
  })
}

function downloadAsset(asset: LocalAsset) {
  if (!asset.downloadUrl) return

  const link = document.createElement('a')
  link.href = asset.downloadUrl
  link.download = asset.name
  link.rel = 'noopener'
  link.click()
}

function triggerUpload() {
  fileInput.value?.click()
}

function createFolder() {
  ElMessage.info('文件夹管理功能建设中')
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length === 0) return

  const uploaded = await Promise.all(files.map((file) => assetService.uploadAsset(file)))
  const newAssets = uploaded.map((item) => ({
    id: item.id,
    name: item.name,
    type: getAssetTypeByMime(item.mimeType),
    imageCategory: getImageCategory(item.name, item.mimeType),
    url: item.contentUrl,
    downloadUrl: item.downloadUrl,
    size: formatFileSize(item.size),
    createdAt: item.createdAt,
  }))

  assets.value = [...newAssets, ...assets.value]
  input.value = ''
}

function getAssetTypeByMime(mimeType: string): LocalAssetType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'file'
}

function belongsToFolder(asset: LocalAsset, folder: FolderKey) {
  if (folder === 'audio') return asset.type === 'audio'
  if (folder === 'video') return asset.type === 'video'
  if (folder === 'files') return asset.type === 'file'
  if (folder === 'roles') return asset.type === 'image' && asset.imageCategory === 'role'
  if (folder === 'scenes') return asset.type === 'image' && asset.imageCategory === 'scene'
  if (folder === 'props') return asset.type === 'image' && asset.imageCategory === 'prop'
  return true
}

function getImageCategory(name: string, mimeType: string): ImageCategory {
  if (!mimeType.startsWith('image/')) return 'unknown'
  const lowerName = name.toLowerCase()
  if (/(角色|avatar|role|人物|人设|形象)/i.test(lowerName)) return 'role'
  if (/(场景|背景|bg|scene|background)/i.test(lowerName)) return 'scene'
  if (/(道具|prop|item|weapon|tool)/i.test(lowerName)) return 'prop'
  return 'unknown'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.assets-page {
  min-height: 100%;
  padding: 24px;
}

.assets-shell {
  display: grid;
  grid-template-columns: 300px 1fr;
  min-height: calc(100vh - 128px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: #1e2125;
}

.folder-panel {
  background: #202328;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 12px;
}

.panel-title {
  font-size: 28px;
  font-weight: 600;
  color: #eaecef;
  margin-bottom: 18px;
  text-align: center;
}

.tree-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tree-group-title {
  font-size: 14px;
  color: #aeb4bc;
  margin: 8px 10px;
}

.tree-item {
  width: 100%;
  border: none;
  background: transparent;
  color: #cfd6de;
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  text-align: left;
  transition: all var(--motion-standard);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  &.active {
    background: rgba(127, 224, 102, 0.12);
    color: #eaf7e4;
  }
}

.tree-icon {
  opacity: 0.9;
}

.tree-text {
  flex: 1;
  font-size: 14px;
}

.tree-count {
  font-size: 12px;
  color: #8b949f;
}

.library-panel {
  padding: 18px 20px;
  overflow: auto;
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h1 {
    font-size: 30px;
    color: #f1f4f8;
    margin-bottom: 6px;
  }
}

.library-path {
  color: #9aa3ad;
  font-size: 13px;
}

.btn-new-folder {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.26);
  color: #e5e9ee;
  padding: 9px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--motion-standard);

  &:hover {
    background: rgba(127, 224, 102, 0.08);
    border-color: rgba(127, 224, 102, 0.7);
    color: var(--accent-success);
  }

  &:active {
    transform: translateY(1px);
  }
}

.file-input {
  display: none;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
  align-items: start;
}

.upload-tile {
  aspect-ratio: 1;
  border: 1px dashed rgba(255, 255, 255, 0.36);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.02);
  color: #e7edf3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all var(--motion-standard);

  .plus {
    font-size: 48px;
    line-height: 1;
  }

  &:hover {
    background: rgba(127, 224, 102, 0.08);
    transform: translateY(-2px);
    border-color: rgba(127, 224, 102, 0.7);
    color: var(--accent-success);
  }
}

.asset-card {
  position: relative;
  background: #262a31;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all var(--motion-standard);

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(127, 224, 102, 0.25);
    box-shadow: var(--shadow-card-hover);
  }
}

.asset-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  background: #ff8a1f;
  color: #fff;
  font-size: 11px;
  border-radius: var(--radius-xs);
  padding: 2px 6px;
}

.asset-preview {
  aspect-ratio: 1;
  overflow: hidden;
  background: #f3f5f8;

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
  padding: 10px 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-name {
  font-size: 13px;
  color: #f0f3f7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-time {
  font-size: 12px;
  color: #99a1aa;
}

.asset-actions {
  padding: 0 12px 12px;
  display: flex;
  gap: 6px;
}

.btn-mini {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #d4dae2;
  border-radius: var(--radius-xs);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  transition: all var(--motion-standard);

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover {
    background: rgba(127, 224, 102, 0.08);
    border-color: #4CAF50;
    color: var(--accent-success);
  }

  &:active {
    transform: translateY(1px);
  }

  &.danger:hover {
    background: rgba(244, 67, 54, 0.08);
    border-color: #f44336;
    color: var(--accent-danger);
  }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #98a2ae;

  .empty-icon { font-size: 48px; margin-bottom: 16px; }
  p { font-size: 15px; }
}

@media (max-width: 1100px) {
  .assets-shell {
    grid-template-columns: 1fr;
  }

  .folder-panel {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
