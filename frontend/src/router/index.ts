import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

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

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '动漫工坊'} - AI漫剧创作平台`
  next()
})

export default router
