import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aiService } from '@/services/ai'
import { aiClient } from '@/services/api'

// Mock API client
vi.mock('@/services/api', () => ({
  aiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateScript', () => {
    it('应该成功生成剧本', async () => {
      const mockScript = '【第一幕】故事开始...'
      vi.mocked(aiClient.post).mockResolvedValue({ script: mockScript })

      const synopsis = '一个关于勇气的故事'
      const result = await aiService.generateScript(synopsis, 'fantasy')
      
      expect(result.script).toBe(mockScript)
      expect(result.fallbackUsed).toBe(false)
      expect(aiClient.post).toHaveBeenCalledWith('/storyboard/generate-script', {
        synopsis,
        storyType: 'fantasy',
      })
    })

    it('应该处理空梗概', async () => {
      vi.mocked(aiClient.post).mockResolvedValue({ script: '默认剧本' })
      const result = await aiService.generateScript('', 'fantasy')
      expect(result.script).toBeDefined()
    })
  })

  describe('generateStoryboard', () => {
    it('应该生成分镜列表', async () => {
      const mockScenes = [
        { id: '1', order: 1, description: '场景1', imageUrl: '', suggestedDuration: 3 },
        { id: '2', order: 2, description: '场景2', imageUrl: '', suggestedDuration: 3 },
      ]
      vi.mocked(aiClient.post).mockResolvedValue({
        title: '测试故事',
        style: 'japanese',
        scenes: mockScenes,
      })

      const prompt = '樱花树下的少年'
      const result = await aiService.generateStoryboard(prompt, 'japanese', 5)
      
      expect(result).toBeDefined()
      expect(result.scenes).toBeDefined()
      expect(Array.isArray(result.scenes)).toBe(true)
    })

    it('应该包含必要的场景属性', async () => {
      const mockScene = {
        id: '1',
        order: 1,
        description: '测试场景',
        imageUrl: '',
        suggestedDuration: 3,
      }
      vi.mocked(aiClient.post).mockResolvedValue({
        title: '测试',
        style: 'japanese',
        scenes: [mockScene],
      })

      const result = await aiService.generateStoryboard('测试', 'japanese', 3)
      const scene = result.scenes[0]
      
      expect(scene).toHaveProperty('order')
      expect(scene).toHaveProperty('description')
      expect(scene).toHaveProperty('suggestedDuration')
      expect(scene.order).toBe(1)
    })
  })

  describe('generateRoleImage', () => {
    it('应该生成角色图片URL', async () => {
      const mockImageUrl = 'http://example.com/role.jpg'
      vi.mocked(aiClient.post).mockResolvedValue({ imageUrl: mockImageUrl })

      const role = {
        id: 'test-1',
        name: '测试角色',
        description: '测试描述',
        avatarUrl: '',
      }
      
      const result = await aiService.generateRoleImage(role, 'japanese')

      expect(result.imageUrl).toBe(mockImageUrl)
      expect(typeof result.imageUrl).toBe('string')
      expect(result.imageUrl).toMatch(/^https?:\/\//)
    })
  })

  describe('generateStoryboardImage', () => {
    it('应该生成分镜图片', async () => {
      const mockImageUrl = 'http://example.com/storyboard.jpg'
      vi.mocked(aiClient.post).mockResolvedValue({ imageUrl: mockImageUrl })

      const scene = {
        id: 'scene-1',
        order: 1,
        description: '测试场景',
        imageUrl: '',
        thumbnailUrl: '',
        videoUrl: '',
        duration: 3,
        transition: 'fade' as const,
        cameraMovement: { type: 'static' as const, speed: 0.5 },
        roleIds: [],
        characters: [],
        dialogue: null,
        narration: '',
        status: 'pending' as const,
        videoStatus: 'pending' as const,
      }
      
      const result = await aiService.generateStoryboardImage(scene, 'japanese', '9:16')

      expect(result.imageUrl).toBe(mockImageUrl)
      expect(typeof result.imageUrl).toBe('string')
    })
  })
})
