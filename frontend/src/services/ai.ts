import { aiClient } from './api'
import type { Scene, Role, SceneBackground, Prop } from '@/types'

/**
 * AI 服务层 — 与 FastAPI AI 后端通信
 * 豆包 (Volcengine Doubao) 模型适配
 */
class AIService {
  /**
   * AI 生成剧本（根据梗概）
   */
  async generateScript(synopsis: string, storyType: string): Promise<string> {
    try {
      const response = await aiClient.post('/storyboard/generate-script', {
        synopsis,
        storyType,
      })
      return (response as any).script
    } catch (error) {
      console.warn('生成剧本失败，返回 mock', error)
      return this.mockScript(synopsis)
    }
  }

  /**
   * AI 分镜 — 从剧本自动生成场景列表
   */
  async generateScenes(script: string, storyType: string): Promise<Scene[]> {
    try {
      const response = await aiClient.post('/storyboard/generate-scenes', {
        script,
        storyType,
      })
      return (response as any).scenes
    } catch (error) {
      console.warn('生成分镜失败，返回 mock', error)
      return this.mockScenes()
    }
  }

  /**
   * AI 生成角色形象
   */
  async generateRoleImage(role: Role, style: string): Promise<string> {
    try {
      const response = await aiClient.post('/image/generate-role', {
        name: role.name,
        description: role.description,
        style,
      })
      return (response as any).imageUrl
    } catch (error) {
      console.warn('生成角色图片失败', error)
      return `https://picsum.photos/seed/${role.id}/256/256`
    }
  }

  /**
   * AI 生成场景背景图
   */
  async generateBackgroundImage(bg: SceneBackground, style: string): Promise<string> {
    try {
      const response = await aiClient.post('/image/generate-background', {
        name: bg.name,
        description: bg.description,
        style,
      })
      return (response as any).imageUrl
    } catch (error) {
      console.warn('生成背景图片失败', error)
      return `https://picsum.photos/seed/${bg.id}/512/288`
    }
  }

  /**
   * AI 生成道具图
   */
  async generatePropImage(prop: Prop, style: string): Promise<string> {
    try {
      const response = await aiClient.post('/image/generate-prop', {
        name: prop.name,
        description: prop.description,
        style,
      })
      return (response as any).imageUrl
    } catch (error) {
      console.warn('生成道具图片失败', error)
      return `https://picsum.photos/seed/${prop.id}/256/256`
    }
  }

  /**
   * AI 生成分镜图
   */
  async generateStoryboardImage(
    scene: Scene,
    style: string,
    aspectRatio: string,
  ): Promise<string> {
    try {
      const response = await aiClient.post('/image/generate', {
        prompt: scene.description,
        style,
        aspectRatio,
      })
      return (response as any).imageUrl
    } catch (error) {
      console.warn('生成分镜图失败', error)
      return `https://picsum.photos/seed/${scene.id}/512/288`
    }
  }

  /**
   * 豆包 Seedance — 生成分镜视频
   */
  async generateSceneVideo(
    scene: Scene,
    model: string,
  ): Promise<{ taskId: string }> {
    try {
      const response = await aiClient.post('/video/generate', {
        sceneId: scene.id,
        imageUrl: scene.imageUrl,
        description: scene.description,
        model,
      })
      return response as any
    } catch (error) {
      console.warn('发起视频生成失败', error)
      return { taskId: `mock-${scene.id}` }
    }
  }

  /**
   * 查询视频生成状态
   */
  async checkVideoStatus(taskId: string): Promise<{
    status: 'pending' | 'generating' | 'done' | 'failed'
    videoUrl?: string
  }> {
    try {
      const response = await aiClient.get(`/video/status/${taskId}`)
      return response as any
    } catch (error) {
      return { status: 'done', videoUrl: '' }
    }
  }

  /**
   * TTS 配音生成
   */
  async generateVoice(
    text: string,
    voiceType: string,
    sceneId: string,
  ): Promise<{ audioUrl: string }> {
    try {
      const response = await aiClient.post('/voice/generate', {
        text,
        voiceType,
        sceneId,
      })
      return response as any
    } catch (error) {
      console.warn('配音生成失败', error)
      return { audioUrl: '' }
    }
  }

  /**
   * 合成最终视频
   */
  async synthesizeVideo(projectId: string): Promise<{ videoUrl: string }> {
    try {
      const response = await aiClient.post('/video/synthesize', { projectId })
      return response as any
    } catch (error) {
      console.warn('视频合成失败', error)
      return { videoUrl: '' }
    }
  }

  /**
   * Babelark 视频生成 - 图生视频或文生视频
   */
  async generateVideoFromImage(params: {
    prompt: string
    imageUrl?: string
    duration?: number
    resolution?: '480P' | '720P' | '1080P'
    aspectRatio?: '1:1' | '16:9' | '9:16' | '21:9' | '4:3' | '3:4'
    useAliModel?: boolean
  }): Promise<{ taskId: string; status: string }> {
    try {
      const response = await aiClient.post('/video/generate', {
        prompt: params.prompt,
        imageUrl: params.imageUrl,
        duration: params.duration || 5,
        resolution: params.resolution || '720P',
        aspectRatio: params.aspectRatio || '9:16',
        useAliModel: params.useAliModel || false,
      })
      return response as any
    } catch (error) {
      console.error('视频生成失败', error)
      throw error
    }
  }

  /**
   * Babelark 查询视频生成状态
   */
  async getVideoGenerationStatus(params: {
    taskId: string
    useAliModel?: boolean
  }): Promise<{
    taskId: string
    status: 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    videoUrl?: string
  }> {
    try {
      const response = await aiClient.post('/video/status', {
        taskId: params.taskId,
        useAliModel: params.useAliModel || false,
      })
      return response as any
    } catch (error) {
      console.error('查询视频状态失败', error)
      throw error
    }
  }

  /**
   * 轮询视频生成状态，直到完成或失败
   */
  async pollVideoGeneration(
    taskId: string,
    useAliModel = false,
    maxAttempts = 60,
    intervalMs = 5000,
  ): Promise<string> {
    let attempts = 0
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getVideoGenerationStatus({ taskId, useAliModel })
        
        if (status.status === 'completed' && status.videoUrl) {
          return status.videoUrl
        }
        
        if (status.status === 'failed') {
          throw new Error('视频生成失败')
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, intervalMs))
        attempts++
      } catch (error) {
        console.error('轮询视频状态出错', error)
        throw error
      }
    }
    
    throw new Error('视频生成超时')
  }

  // ==================== Mock 数据 ====================

  private mockScript(synopsis: string): string {
    return `第一幕：开篇
（旁白）${synopsis.substring(0, 30)}...的故事从这里开始。
场景一：远景，展现世界观。

第二幕：发展
场景二：主角登场，展现角色性格。
对白：\"我一定要完成这个使命。\"

第三幕：高潮
场景三：关键冲突爆发。
场景四：激烈对决。

第四幕：结局
场景五：故事收尾，留下悬念。`
  }

  private mockScenes(): Scene[] {
    return Array.from({ length: 5 }, (_, i) => ({
      id: `scene-${Date.now()}-${i}`,
      order: i + 1,
      description: `第${i + 1}个场景的描述`,
      imageUrl: `https://picsum.photos/seed/scene${i}/512/288`,
      thumbnailUrl: `https://picsum.photos/seed/scene${i}/256/144`,
      videoUrl: '',
      videoStatus: 'pending' as const,
      duration: 3,
      transition: 'fade' as const,
      cameraMovement: { type: 'static' as const, speed: 0 },
      roleIds: [],
      narration: '',
      backgroundId: '',
      characters: [],
      dialogue: null,
      status: 'pending' as const,
    }))
  }
}

export const aiService = new AIService()
