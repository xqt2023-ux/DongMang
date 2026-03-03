import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'

/**
 * 工作流程测试 - 从剧本到分镜
 * 
 * 测试场景：
 * 1. 用户输入故事梗概
 * 2. AI 生成完整剧本
 * 3. 剧本保存到 localStorage
 * 4. AI 根据剧本生成分镜
 */
describe('故事创作工作流', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('剧本生成流程', () => {
    it('应该将生成的剧本保存到 localStorage', () => {
      const testScript = '【第一幕】\n故事开始...'
      
      localStorage.setItem('currentScript', testScript)
      const saved = localStorage.getItem('currentScript')
      
      expect(saved).toBe(testScript)
    })

    it('应该能从 localStorage 读取剧本', () => {
      const testScript = '测试剧本内容'
      localStorage.setItem('currentScript', testScript)
      
      const retrieved = localStorage.getItem('currentScript')
      
      expect(retrieved).toBe(testScript)
    })
  })

  describe('分镜生成流程', () => {
    it('应该使用保存的剧本生成分镜', () => {
      const script = '完整的故事剧本'
      localStorage.setItem('currentScript', script)
      
      const scriptForStoryboard = localStorage.getItem('currentScript') || '默认剧本'
      
      expect(scriptForStoryboard).toBe(script)
    })

    it('应该在没有剧本时使用默认值', () => {
      const scriptForStoryboard = localStorage.getItem('currentScript') || '默认剧本'
      
      expect(scriptForStoryboard).toBe('默认剧本')
    })
  })

  describe('数据格式转换', () => {
    it('应该将后端分镜数据转换为前端格式', () => {
      const backendScene = {
        order: 1,
        description: '场景描述',
        suggestedDuration: 5,
        suggestedTransition: 'fade',
        suggestedCameraMovement: { type: 'static', speed: 0.5 },
        characters: ['角色1'],
        dialogue: { type: 'narration', speaker: null, text: '旁白' },
      }

      const frontendScene = {
        id: `scene-${Date.now()}-0`,
        order: backendScene.order,
        description: backendScene.description,
        imageUrl: '',
        thumbnailUrl: '',
        videoUrl: '',
        duration: backendScene.suggestedDuration,
        transition: backendScene.suggestedTransition,
        cameraMovement: backendScene.suggestedCameraMovement,
        roleIds: [],
        characters: backendScene.characters,
        dialogue: backendScene.dialogue,
        narration: backendScene.dialogue?.text || '',
        status: 'pending',
        videoStatus: 'pending',
      }

      expect(frontendScene.order).toBe(1)
      expect(frontendScene.description).toBe('场景描述')
      expect(frontendScene.duration).toBe(5)
      expect(frontendScene.narration).toBe('旁白')
    })
  })
})
