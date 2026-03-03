import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useProjectStore } from '@/stores/project'

const routes: RouteRecordRaw[] = [
  // ==================== 首页 & 公共页 ====================
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页', showSidebar: false },
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('@/views/GalleryView.vue'),
    meta: { title: '案例广场', showSidebar: false },
  },
  {
    path: '/my-works',
    name: 'MyWorks',
    component: () => import('@/views/MyWorksView.vue'),
    meta: { title: '我的作品', showSidebar: false },
  },
  {
    path: '/assets',
    name: 'Assets',
    component: () => import('@/views/AssetsView.vue'),
    meta: { title: '资产库', showSidebar: false },
  },

  // ==================== 7 步创作工作流 ====================
  {
    path: '/editor/:id',
    name: 'Editor',
    component: () => import('@/views/editor/EditorLayout.vue'),
    meta: { title: '创作编辑', showSidebar: true },
    redirect: (to) => ({ name: 'GlobalSettings', params: to.params }),
    children: [
      {
        path: 'global-settings',
        name: 'GlobalSettings',
        component: () => import('@/views/editor/GlobalSettingsView.vue'),
        meta: { title: '全局设定', step: 1 },
      },
      {
        path: 'story-script',
        name: 'StoryScript',
        component: () => import('@/views/editor/StoryScriptView.vue'),
        meta: { title: '故事剧本', step: 2 },
      },
      {
        path: 'scene-assets',
        name: 'SceneAssets',
        component: () => import('@/views/editor/SceneAssetsView.vue'),
        meta: { title: '场景角色道具', step: 3 },
      },
      {
        path: 'storyboard',
        name: 'Storyboard',
        component: () => import('@/views/editor/StoryboardView.vue'),
        meta: { title: '分镜脚本', step: 4 },
      },
      {
        path: 'storyboard-video',
        name: 'StoryboardVideo',
        component: () => import('@/views/editor/StoryboardVideoView.vue'),
        meta: { title: '分镜视频', step: 5 },
      },
      {
        path: 'voice-lipsync',
        name: 'VoiceLipsync',
        component: () => import('@/views/editor/VoiceLipsyncView.vue'),
        meta: { title: '配音对口型', step: 6 },
      },
      {
        path: 'video-preview',
        name: 'VideoPreview',
        component: () => import('@/views/editor/VideoPreviewView.vue'),
        meta: { title: '视频预览', step: 7 },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  document.title = `${to.meta.title || '动漫工坊'} - AI漫剧创作平台`
  
  const projectStore = useProjectStore()
  
  // 如果从编辑器页面离开（切换步骤或离开编辑器），自动保存当前项目
  const isLeavingEditor = from.matched.some(record => record.name === 'Editor') &&
                          from.params.id &&
                          projectStore.currentProject
  
  if (isLeavingEditor) {
    try {
      console.log('🔄 切换步骤，自动保存项目...')
      await projectStore.saveCurrentProject()
      console.log('✅ 项目已自动保存')
    } catch (error) {
      console.error('❌ 自动保存失败:', error)
      // 保存失败不阻止导航，但给用户提示
      // ElMessage 需要在这里异步导入
      import('element-plus').then(({ ElMessage }) => {
        ElMessage.warning('项目保存失败，请手动保存')
      })
    }
  }
  
  // 如果进入编辑器页面，加载项目数据
  if (to.name === 'Editor' || to.matched.some(record => record.name === 'Editor')) {
    const projectId = to.params.id as string
    if (projectId) {
      try {
        // 从后端加载项目
        await projectStore.loadProject(projectId)
        console.log('✅ 项目已加载:', projectId)
      } catch (error) {
        console.error('加载项目失败:', error)
        // 如果项目不存在，跳转到我的作品页
        next({ name: 'MyWorks' })
        return
      }
    }
  }
  
  next()
})

export default router
