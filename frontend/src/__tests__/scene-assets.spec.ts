import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SceneAssetsView from '@/views/editor/SceneAssetsView.vue'
import { useProjectStore } from '@/stores/project'

vi.mock('@/services', () => ({
  aiService: {
    generateRoleImage: vi.fn(),
    generateBackgroundImage: vi.fn(),
    generatePropImage: vi.fn(),
  },
  projectService: {
    saveFullProject: vi.fn(),
    getOne: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { aiService } from '@/services'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

function createProject() {
  return {
    id: 'p1',
    title: '测试项目',
    description: '',
    globalSettings: {
      storyType: 'ancient-hero',
      customStoryType: '',
      animeStyle: 'japanese',
      aspectRatio: '16:9',
      tone: '',
    },
    script: '',
    roles: [],
    props: [
      { id: 'prop-1', name: '道具1', description: '金色法器', imageUrl: '' },
    ],
    sceneBackgrounds: [
      { id: 'bg-1', name: '场景1', description: '夜色城市', imageUrl: '' },
    ],
    scenes: [],
    audioTrack: null,
    voiceTracks: [],
    duration: 0,
    resolution: { width: 1920, height: 1080 },
    status: 'draft',
    coverUrl: '',
    videoUrl: '',
    shareToken: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('SceneAssetsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useProjectStore()
    store.currentProject = createProject() as any
    ;(aiService.generateBackgroundImage as any).mockResolvedValue('https://example.com/bg.png')
    ;(aiService.generatePropImage as any).mockResolvedValue('https://example.com/prop.png')
  })

  it('should generate background image and update UI', async () => {
    const wrapper = mount(SceneAssetsView, {
      global: {
        stubs: ['el-dialog', 'el-input'],
      },
    })

    await flushPromises()

    const btn = wrapper.find('[data-test="generate-bg-bg-1"]')
    expect(btn.exists()).toBe(true)

    await btn.trigger('click')
    await flushPromises()

    expect(aiService.generateBackgroundImage).toHaveBeenCalled()
  })

  it('should generate prop image and update UI', async () => {
    const wrapper = mount(SceneAssetsView, {
      global: {
        stubs: ['el-dialog', 'el-input'],
      },
    })

    await flushPromises()

    const btn = wrapper.find('[data-test="generate-prop-prop-1"]')
    expect(btn.exists()).toBe(true)

    await btn.trigger('click')
    await flushPromises()

    expect(aiService.generatePropImage).toHaveBeenCalled()
  })

})
