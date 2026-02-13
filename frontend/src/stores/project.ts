import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Project,
  Scene,
  GlobalSettings,
  Role,
  Prop,
  SceneBackground,
  VoiceTrack,
  TransitionType,
  ExportProgress,
} from '@/types'

/**
 * 项目状态管理 — 7步工作流
 */
export const useProjectStore = defineStore('project', () => {
  // ==================== State ====================
  const currentProject = ref<Project | null>(null)
  const projects = ref<Project[]>([])
  const isGenerating = ref(false)
  const exportProgress = ref<ExportProgress | null>(null)
  const error = ref<string | null>(null)

  // ==================== Getters ====================
  const scenes = computed(() => currentProject.value?.scenes ?? [])
  const roles = computed(() => currentProject.value?.roles ?? [])
  const totalDuration = computed(() =>
    scenes.value.reduce((sum, s) => sum + s.duration, 0)
  )
  const isReadyForPreview = computed(() =>
    scenes.value.length > 0 && scenes.value.every((s) => s.videoStatus === 'done')
  )

  // ==================== Actions ====================

  /** 创建新项目 */
  function createProject(id?: string): Project {
    const project: Project = {
      id: id || generateId(),
      title: '',
      description: '',
      globalSettings: {
        storyType: '',
        animeStyle: 'japanese',
        aspectRatio: '16:9',
        tone: '',
      },
      script: '',
      scenes: [],
      roles: [],
      props: [],
      sceneBackgrounds: [],
      voiceTracks: [],
      coverUrl: '',
      videoUrl: '',
      shareToken: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    currentProject.value = project
    projects.value.push(project)
    return project
  }

  /** 加载项目 */
  function loadProject(id: string) {
    const p = projects.value.find((p) => p.id === id)
    if (p) {
      currentProject.value = p
    } else {
      createProject(id)
    }
  }

  /** 更新全局设置 */
  function updateGlobalSettings(settings: Partial<GlobalSettings>) {
    if (!currentProject.value) return
    currentProject.value.globalSettings = {
      ...currentProject.value.globalSettings,
      ...settings,
    }
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 更新剧本 */
  function updateScript(script: string) {
    if (!currentProject.value) return
    currentProject.value.script = script
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 添加角色 */
  function addRole(role: Role) {
    if (!currentProject.value) return
    currentProject.value.roles.push(role)
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 更新角色 */
  function updateRole(roleId: string, updates: Partial<Role>) {
    if (!currentProject.value) return
    const idx = currentProject.value.roles.findIndex((r) => r.id === roleId)
    if (idx !== -1) {
      currentProject.value.roles[idx] = { ...currentProject.value.roles[idx], ...updates }
      currentProject.value.updatedAt = new Date().toISOString()
    }
  }

  /** 删除角色 */
  function removeRole(roleId: string) {
    if (!currentProject.value) return
    currentProject.value.roles = currentProject.value.roles.filter((r) => r.id !== roleId)
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 添加道具 */
  function addProp(prop: Prop) {
    if (!currentProject.value) return
    currentProject.value.props.push(prop)
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 添加场景背景 */
  function addBackground(bg: SceneBackground) {
    if (!currentProject.value) return
    currentProject.value.sceneBackgrounds.push(bg)
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 设置场景列表（AI 分镜后） */
  function setScenes(newScenes: Scene[]) {
    if (!currentProject.value) return
    currentProject.value.scenes = newScenes
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 添加场景 */
  function addScene(scene: Scene) {
    if (!currentProject.value) return
    currentProject.value.scenes.push(scene)
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 更新单个场景 */
  function updateScene(sceneId: string, updates: Partial<Scene>) {
    if (!currentProject.value) return
    const index = currentProject.value.scenes.findIndex((s) => s.id === sceneId)
    if (index !== -1) {
      currentProject.value.scenes[index] = {
        ...currentProject.value.scenes[index],
        ...updates,
      }
      currentProject.value.updatedAt = new Date().toISOString()
    }
  }

  /** 删除场景 */
  function removeScene(sceneId: string) {
    if (!currentProject.value) return
    currentProject.value.scenes = currentProject.value.scenes
      .filter((s) => s.id !== sceneId)
      .map((s, i) => ({ ...s, order: i + 1 }))
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 重新排序场景 */
  function reorderScenes(newOrder: string[]) {
    if (!currentProject.value) return
    const scenesMap = new Map(currentProject.value.scenes.map((s) => [s.id, s]))
    currentProject.value.scenes = newOrder
      .map((id, index) => {
        const scene = scenesMap.get(id)
        if (scene) scene.order = index + 1
        return scene
      })
      .filter((s): s is Scene => !!s)
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 设置转场效果 */
  function setTransition(sceneId: string, transition: TransitionType) {
    updateScene(sceneId, { transition })
  }

  /** 添加配音轨道 */
  function addVoiceTrack(track: VoiceTrack) {
    if (!currentProject.value) return
    currentProject.value.voiceTracks.push(track)
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 设置封面 */
  function setCover(url: string) {
    if (!currentProject.value) return
    currentProject.value.coverUrl = url
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 设置最终视频 */
  function setFinalVideo(url: string) {
    if (!currentProject.value) return
    currentProject.value.videoUrl = url
    currentProject.value.status = 'published'
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 更新项目标题 */
  function updateTitle(title: string) {
    if (!currentProject.value) return
    currentProject.value.title = title
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 设置导出进度 */
  function setExportProgress(progress: ExportProgress | null) {
    exportProgress.value = progress
  }

  /** 清除错误 */
  function clearError() {
    error.value = null
  }

  return {
    // State
    currentProject,
    projects,
    isGenerating,
    exportProgress,
    error,
    // Getters
    scenes,
    roles,
    totalDuration,
    isReadyForPreview,
    // Actions
    createProject,
    loadProject,
    updateGlobalSettings,
    updateScript,
    addRole,
    updateRole,
    removeRole,
    addProp,
    addBackground,
    setScenes,
    addScene,
    updateScene,
    removeScene,
    reorderScenes,
    setTransition,
    addVoiceTrack,
    setCover,
    setFinalVideo,
    updateTitle,
    setExportProgress,
    clearError,
  }
})

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}
