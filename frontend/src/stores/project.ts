import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { projectService } from '@/services'
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
 * 项目状态管理 — 7步工作流（后端持久化版本）
 */
export const useProjectStore = defineStore('project', () => {
  // ==================== State ====================
  const currentProject = ref<Project | null>(null)
  const projects = ref<Project[]>([])
  const isGenerating = ref(false)
  const exportProgress = ref<ExportProgress | null>(null)
  const error = ref<string | null>(null)
  const isHydrating = ref(false)
  const isSaving = ref(false)
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleAutoSave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(async () => {
      if (!currentProject.value || isSaving.value) return
      try {
        await saveCurrentProject()
      } catch (error) {
        console.error('自动保存失败:', error)
      }
    }, 1500)
  }

  // ==================== Getters ====================
  const scenes = computed(() => currentProject.value?.scenes ?? [])
  const roles = computed(() => currentProject.value?.roles ?? [])
  const totalDuration = computed(() =>
    scenes.value.reduce((sum, s) => sum + s.duration, 0)
  )
  const isReadyForPreview = computed(() =>
    scenes.value.length > 0 && scenes.value.every((s) => s.videoStatus === 'generated')
  )

  // ==================== Actions ====================

  /** 加载项目（从后端） */
  async function loadProject(id: string) {
    try {
      isHydrating.value = true
      currentProject.value = await projectService.getOne(id)
    } catch (error) {
      console.error('加载项目失败:', error)
      throw error
    } finally {
      isHydrating.value = false
    }
  }

  /** 更新全局设置 */
  async function updateGlobalSettings(settings: Partial<GlobalSettings>) {
    if (!currentProject.value) return
    try {
      const updated = await projectService.updateGlobalSettings(
        currentProject.value.id,
        settings
      )
      currentProject.value = updated
    } catch (error) {
      console.error('更新全局设置失败:', error)
      throw error
    }
  }

  /** 更新剧本 */
  async function updateScript(script: string) {
    if (!currentProject.value) return
    try {
      const updated = await projectService.update(currentProject.value.id, { script })
      currentProject.value = updated
    } catch (error) {
      console.error('更新剧本失败:', error)
      throw error
    }
  }

  /** 添加角色 */
  async function addRole(role: Role) {
    if (!currentProject.value) return
    try {
      await projectService.addRole(currentProject.value.id, role)
      currentProject.value.roles.push(role)
      currentProject.value.updatedAt = new Date().toISOString()
    } catch (error) {
      console.error('添加角色失败:', error)
      throw error
    }
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
  async function removeRole(roleId: string) {
    if (!currentProject.value) return
    try {
      await projectService.removeRole(currentProject.value.id, roleId)
      currentProject.value.roles = currentProject.value.roles.filter((r) => r.id !== roleId)
      currentProject.value.updatedAt = new Date().toISOString()
    } catch (error) {
      console.error('删除角色失败:', error)
      throw error
    }
  }

  /** 添加道具 */
  async function addProp(prop: Prop) {
    if (!currentProject.value) return
    try {
      await projectService.addProp(currentProject.value.id, prop)
      currentProject.value.props.push(prop)
      currentProject.value.updatedAt = new Date().toISOString()
    } catch (error) {
      console.error('添加道具失败:', error)
      throw error
    }
  }

  /** 添加场景背景 */
  async function addBackground(bg: SceneBackground) {
    if (!currentProject.value) return
    try {
      await projectService.addBackground(currentProject.value.id, bg)
      currentProject.value.sceneBackgrounds.push(bg)
      currentProject.value.updatedAt = new Date().toISOString()
    } catch (error) {
      console.error('添加场景背景失败:', error)
      throw error
    }
  }

  /** 设置场景列表（AI 分镜后） */
  function setScenes(newScenes: Scene[]) {
    if (!currentProject.value) return
    currentProject.value.scenes = newScenes
    currentProject.value.updatedAt = new Date().toISOString()
  }

  /** 添加场景 */
  async function addScene(scene: Scene) {
    if (!currentProject.value) return
    try {
      await projectService.addScene(currentProject.value.id, scene)
      currentProject.value.scenes.push(scene)
      currentProject.value.updatedAt = new Date().toISOString()
    } catch (error) {
      console.error('添加场景失败:', error)
      throw error
    }
  }

  /** 更新单个场景 */
  async function updateScene(sceneId: string, updates: Partial<Scene>) {
    if (!currentProject.value) return
    try {
      await projectService.updateScene(currentProject.value.id, sceneId, updates)
        const index = currentProject.value.scenes.findIndex((s) => s.id === sceneId)
      if (index !== -1) {
        currentProject.value.scenes[index] = {
          ...currentProject.value.scenes[index],
          ...updates,
        }
        currentProject.value.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('更新场景失败:', error)
      throw error
    }
  }

  /** 删除场景 */
  async function removeScene(sceneId: string) {
    if (!currentProject.value) return
    try {
      await projectService.removeScene(currentProject.value.id, sceneId)
      currentProject.value.scenes = currentProject.value.scenes
        .filter((s) => s.id !== sceneId)
        .map((s, i) => ({ ...s, order: i + 1 }))
      currentProject.value.updatedAt = new Date().toISOString()
    } catch (error) {
      console.error('删除场景失败:', error)
      throw error
    }
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
  async function addVoiceTrack(track: VoiceTrack) {
    if (!currentProject.value) return
    try {
      await projectService.addVoiceTrack(currentProject.value.id, track)
      currentProject.value.voiceTracks.push(track)
      currentProject.value.updatedAt = new Date().toISOString()
    } catch (error) {
      console.error('添加配音轨道失败:', error)
      throw error
    }
  }

  /** 设置封面 */
  async function setCover(url: string) {
    if (!currentProject.value) return
    try {
      const updated = await projectService.update(currentProject.value.id, { coverUrl: url })
      currentProject.value = updated
    } catch (error) {
      console.error('设置封面失败:', error)
      throw error
    }
  }

  /** 设置最终视频 */
  async function setFinalVideo(url: string) {
    if (!currentProject.value) return
    try {
      const updated = await projectService.update(currentProject.value.id, {
        videoUrl: url,
        status: 'published',
      })
      currentProject.value = updated
    } catch (error) {
      console.error('设置最终视频失败:', error)
      throw error
    }
  }

  /** 更新项目标题 */
  async function updateTitle(title: string) {
    if (!currentProject.value) return
    try {
      const updated = await projectService.update(currentProject.value.id, { title })
      currentProject.value = updated
    } catch (error) {
      console.error('更新项目标题失败:', error)
      throw error
    }
  }

  /** 保存当前项目的完整状态到后端 */
  async function saveCurrentProject() {
    if (!currentProject.value) return
    
    try {
      isSaving.value = true
      // 保存项目的所有数据到后端
      const updated = await projectService.saveFullProject(
        currentProject.value.id,
        currentProject.value,
      )
      
      // 更新本地状态
      currentProject.value = updated
      console.log('✅ 项目完整数据已保存到后端')
    } catch (error) {
      console.error('❌ 保存项目失败:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  watch(
    currentProject,
    () => {
      if (!currentProject.value || isHydrating.value || isSaving.value) return
      scheduleAutoSave()
    },
    { deep: true },
  )

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
    loadProject,
    saveCurrentProject,
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
