<template>
  <div class="my-works-page">
    <div class="works-shell">
      <aside class="summary-panel">
        <h1>我的作品</h1>
        <p class="summary-subtitle">项目管理</p>

        <div class="stat-card">
          <span class="stat-label">项目总数</span>
          <span class="stat-value">{{ projects.length }}</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">草稿数</span>
          <span class="stat-value">{{ draftCount }}</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">已发布</span>
          <span class="stat-value">{{ publishedCount }}</span>
        </div>

        <button class="btn-new" @click="createNew">+ 新建项目</button>
      </aside>

      <main class="works-panel">
        <div class="panel-header">
          <div>
            <h2>作品列表</h2>
            <p class="panel-path">工作台 > 我的作品</p>
          </div>
          <button class="btn-new small" @click="createNew">+ 新建项目</button>
        </div>

        <div class="works-grid" v-if="projects.length">
          <article class="work-card" v-for="p in projects" :key="p.id">
            <div class="item-cover" @click="editProject(p.id)">
              <img :src="getProjectCover(p)" :alt="p.title" />
              <span class="item-status" :class="p.status">{{ statusLabel(p.status) }}</span>
            </div>
            <div class="item-info">
              <h3>{{ p.title || '未命名项目' }}</h3>
              <p class="item-meta">{{ p.globalSettings?.storyType || '未设定类型' }} · {{ formatTime(p.updatedAt) }}</p>
              <p class="item-summary">{{ p.globalSettings?.tone || '暂无简介' }}</p>
            </div>
            <div class="item-actions">
              <button class="btn-ghost" @click="editProject(p.id)">继续编辑</button>
              <button class="btn-ghost danger" @click="deleteProject(p.id)">删除</button>
            </div>
          </article>
        </div>

        <div class="empty-state" v-else>
          <div class="empty-icon">📝</div>
          <p>还没有项目，点击“新建项目”开始创作</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectService } from '@/services'
import type { Project } from '@/types'

const router = useRouter()
const defaultCover = 'https://picsum.photos/seed/default-cover/400/300'

const projects = ref<Project[]>([])
const loading = ref(false)

const publishedCount = computed(() => projects.value.filter((p) => p.status === 'published').length)
const draftCount = computed(() => projects.value.filter((p) => p.status !== 'published').length)

// 组件挂载时加载项目列表
onMounted(async () => {
  await loadProjects()
})

/** 加载所有项目 */
async function loadProjects() {
  try {
    loading.value = true
    projects.value = await projectService.getAll()
  } catch (error: any) {
    console.error('加载项目列表失败:', error)
    ElMessage.error('加载项目列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

/** 创建新项目 */
async function createNew() {
  try {
    const title = '未命名项目 ' + new Date().toLocaleDateString()
    const newProject = await projectService.create({ title })
    ElMessage.success('项目创建成功')
    router.push(`/editor/${newProject.id}/global-settings`)
  } catch (error: any) {
    console.error('创建项目失败:', error)
    ElMessage.error('创建项目失败: ' + error.message)
  }
}

/** 编辑项目 */
function editProject(id: string) {
  router.push(`/editor/${id}/global-settings`)
}

/** 删除项目 */
async function deleteProject(id: string) {
  try {
    await ElMessageBox.confirm('确定要删除这个项目吗？此操作不可恢复。', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })

    await projectService.delete(id)
    projects.value = projects.value.filter((p) => p.id !== id)
    ElMessage.success('项目已删除')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除项目失败:', error)
      ElMessage.error('删除项目失败: ' + error.message)
    }
  }
}

function statusLabel(status: string) {
  return status === 'published' ? '已发布' : '草稿'
}

function formatTime(time: string) {
  const d = new Date(time)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getProjectCover(project: Project): string {
  if (project.coverUrl) return project.coverUrl

  const sceneThumb = project.scenes?.find((scene) => scene.thumbnailUrl || scene.imageUrl)
  if (sceneThumb?.thumbnailUrl) return sceneThumb.thumbnailUrl
  if (sceneThumb?.imageUrl) return sceneThumb.imageUrl

  const sceneBg = project.sceneBackgrounds?.find((bg) => bg.imageUrl)
  if (sceneBg?.imageUrl) return sceneBg.imageUrl

  const roleForm = project.roles
    ?.flatMap((role) => role.roleForms || [])
    .find((form) => form.fullBodyUrl || form.threeViewUrl)
  if (roleForm?.fullBodyUrl) return roleForm.fullBodyUrl
  if (roleForm?.threeViewUrl) return roleForm.threeViewUrl

  const roleAvatar = project.roles?.find((role) => role.avatarUrl)
  if (roleAvatar?.avatarUrl) return roleAvatar.avatarUrl

  const propImage = project.props?.find((prop) => prop.imageUrl)
  if (propImage?.imageUrl) return propImage.imageUrl

  return defaultCover
}
</script>

<style scoped lang="scss">
.my-works-page {
  min-height: 100%;
  padding: 24px;
}

.works-shell {
  display: grid;
  grid-template-columns: 300px 1fr;
  min-height: calc(100vh - 128px);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #1e2125;
}

.summary-panel {
  background: #202328;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #eaecef;
  }
}

.summary-subtitle {
  color: #95a0ad;
  font-size: 13px;
  margin-bottom: 6px;
}

.stat-card {
  background: #272c33;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #a8b0bb;
  font-size: 13px;
}

.stat-value {
  color: #f1f5f9;
  font-size: 18px;
  font-weight: 700;
}

.btn-new {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.26);
  color: #e6ebf2;
  padding: 9px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--motion-standard);
  margin-top: 8px;

  &:hover {
    background: rgba(127, 224, 102, 0.08);
    border-color: rgba(127, 224, 102, 0.8);
    color: var(--accent-success);
  }

  &:active {
    transform: translateY(1px);
  }

  &.small {
    margin-top: 0;
    padding: 8px 14px;
  }
}

.works-panel {
  padding: 18px 20px;
  overflow: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h2 {
    font-size: 30px;
    color: #f1f4f8;
    margin-bottom: 6px;
  }
}

.panel-path {
  color: #9aa3ad;
  font-size: 13px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 16px;
}

.work-card {
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

.item-cover {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  cursor: pointer;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.item-status {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: var(--radius-md);
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
  min-width: 0;
  padding: 12px 12px 8px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #f0f3f7;
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.item-meta {
  font-size: 12px;
  color: #98a2ad;
  margin-bottom: 6px;
}

.item-summary {
  font-size: 13px;
  color: #adb5bf;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  padding: 0 12px 12px;
  display: flex;
  gap: 8px;
}

.btn-ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #d5dbe3;
  padding: 6px 12px;
  border-radius: var(--radius-xs);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--motion-standard);

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

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  p { font-size: 15px; }
}

@media (max-width: 1100px) {
  .works-shell {
    grid-template-columns: 1fr;
  }

  .summary-panel {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
