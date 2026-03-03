import { aiClient } from './api'
import type { Scene, Role, SceneBackground, Prop } from '@/types'

export interface ExtractedAssetItem {
  name: string
  description: string
  confidence: number
  evidence?: string
}

export interface ExtractAssetsResult {
  scenes: ExtractedAssetItem[]
  roles: ExtractedAssetItem[]
  props: ExtractedAssetItem[]
  modelUsed?: string
  fallbackUsed?: boolean
}

/**
 * AI 服务层 — 与 FastAPI AI 后端通信
 * 豆包 (Volcengine Doubao) 模型适配
 */
class AIService {
  private buildResolution(aspectRatio: string) {
    return {
      width: aspectRatio === '9:16' ? 1024 : 1792,
      height: aspectRatio === '9:16' ? 1792 : 1024,
    }
  }

  private getErrorMessage(error: any, fallback: string): string {
    const data = error?.response?.data
    const detail = data?.detail || data?.message || data?.error
    if (typeof data === 'string' && data.trim()) return data
    if (detail) return detail
    return error?.message || fallback
  }
  /**
   * AI 生成剧本（根据梗概）
   */
  async generateScript(synopsis: string, storyType: string): Promise<{
    script: string
    modelUsed?: string
    fallbackUsed?: boolean
  }> {
    try {
      const response = await aiClient.post('/storyboard/generate-script', {
        synopsis,
        storyType,
      })
      const data = response as any
      return {
        script: data?.script || '',
        modelUsed: data?.modelUsed,
        fallbackUsed: !!data?.fallbackUsed,
      }
    } catch (error) {
      console.warn('生成剧本失败，返回 mock', error)
      return {
        script: this.mockScript(synopsis),
        modelUsed: 'frontend-mock-script',
        fallbackUsed: true,
      }
    }
  }

  /**
   * AI 分镜 — 从提示词生成分镜场景列表
   */
  async generateStoryboard(prompt: string, style: string = 'japanese', sceneCount: number = 5): Promise<{
    title: string
    style: string
    scenes: Scene[]
    modelUsed?: string
    fallbackUsed?: boolean
  }> {
    try {
      const response = await aiClient.post('/storyboard/generate', {
        prompt,
        style,
        sceneCount,
      })
      const data = response as any
      if (!data?.scenes || !Array.isArray(data.scenes) || data.scenes.length === 0) {
        throw new Error('AI 未返回有效分镜内容')
      }
      return data
    } catch (error: any) {
      const message = this.getErrorMessage(error, '分镜生成失败')
      console.warn('生成分镜失败', error)
      throw new Error(message)
    }
  }

  /**
   * 从完整剧本提取 场景/角色/道具
   */
  async extractAssetsFromScript(
    script: string,
    agents: {
      sceneAgent: string
      roleAgent: string
      propAgent: string
    },
  ): Promise<ExtractAssetsResult> {
    try {
      const response = await aiClient.post('/storyboard/extract-assets', {
        script,
        sceneAgent: agents.sceneAgent,
        roleAgent: agents.roleAgent,
        propAgent: agents.propAgent,
      })
      const data = response as any
      return {
        scenes: Array.isArray(data?.scenes) ? data.scenes : [],
        roles: Array.isArray(data?.roles) ? data.roles : [],
        props: Array.isArray(data?.props) ? data.props : [],
        modelUsed: data?.modelUsed,
        fallbackUsed: !!data?.fallbackUsed,
      }
    } catch (error: any) {
      const message = this.getErrorMessage(error, '提取场景/角色/道具失败')
      console.warn('提取场景/角色/道具失败', error)
      throw new Error(message)
    }
  }

  /**
   * AI 生成角色形象
   */
  async generateRoleImage(role: Role, style: string): Promise<{
    imageUrl: string
    modelUsed?: string
  }> {
    try {
      const referenceImages = [role.avatarUrl].filter(Boolean)
      const response = await aiClient.post('/image/generate', {
        description: `${role.name}，${role.description || ''}`,
        style,
        resolution: this.buildResolution('1:1'),
        referenceImages,
      })
      return {
        imageUrl: (response as any).imageUrl,
        modelUsed: (response as any).modelUsed,
      }
    } catch (error: any) {
      const message = this.getErrorMessage(error, '生成角色图片失败')
      console.warn('生成角色图片失败', error)
      throw new Error(message)
    }
  }

  /**
   * AI 生成场景背景图
   */
  async generateBackgroundImage(bg: SceneBackground, style: string): Promise<string> {
    try {
      const response = await aiClient.post('/image/generate', {
        description: `${bg.name}，${bg.description || ''}`,
        style,
        resolution: this.buildResolution('16:9'),
      })
      return (response as any).imageUrl
    } catch (error: any) {
      const message = this.getErrorMessage(error, '生成背景图片失败')
      console.warn('生成背景图片失败', error)
      throw new Error(message)
    }
  }

  /**
   * AI 生成道具图
   */
  async generatePropImage(prop: Prop, style: string): Promise<string> {
    try {
      const response = await aiClient.post('/image/generate', {
        description: `${prop.name}，${prop.description || ''}`,
        style,
        resolution: this.buildResolution('16:9'),
      })
      return (response as any).imageUrl
    } catch (error: any) {
      const message = this.getErrorMessage(error, '生成道具图片失败')
      console.warn('生成道具图片失败', error)
      throw new Error(message)
    }
  }

  /**
   * AI 生成分镜图
   */
  async generateStoryboardImage(
    scene: Scene,
    style: string,
    aspectRatio: string,
    customPrompt?: string,
    negativePrompt?: string,
    referenceImages?: string[],
  ): Promise<{
    imageUrl: string
    thumbnailUrl: string
    promptUsed: string
    translatedPrompt?: string
    negativePromptUsed?: string
    modelUsed?: string
  }> {
    try {
      const response = await aiClient.post('/image/generate', {
        description: scene.description,
        style,
        resolution: this.buildResolution(aspectRatio),
        customPrompt: customPrompt || undefined,
        negativePrompt: negativePrompt || undefined,
        referenceImages: referenceImages && referenceImages.length > 0 ? referenceImages : undefined,
      })
      return {
        imageUrl: (response as any).imageUrl,
        thumbnailUrl: (response as any).thumbnailUrl,
        promptUsed: (response as any).promptUsed,
        translatedPrompt: (response as any).translatedPrompt,
        negativePromptUsed: (response as any).negativePromptUsed,
        modelUsed: (response as any).modelUsed,
      }
    } catch (error) {
      console.warn('生成分镜图失败', error)
      throw error
    }
  }

  async generateSceneImage(params: {
    description: string
    style?: string
    aspectRatio?: string
    customPrompt?: string
    negativePrompt?: string
    referenceImages?: string[]
  }): Promise<{
    imageUrl: string
    promptUsed: string
    translatedPrompt?: string
    modelUsed?: string
  }> {
    try {
      const response = await aiClient.post('/image/generate', {
        description: params.description,
        style: params.style || 'japanese',
        resolution: this.buildResolution(params.aspectRatio || '16:9'),
        customPrompt: params.customPrompt || undefined,
        negativePrompt: params.negativePrompt || undefined,
        referenceImages: params.referenceImages || [],
      })
      return {
        imageUrl: (response as any).imageUrl,
        promptUsed: (response as any).promptUsed,
        translatedPrompt: (response as any).translatedPrompt,
        modelUsed: (response as any).modelUsed,
      }
    } catch (error: any) {
      const message = this.getErrorMessage(error, '生成场景图失败')
      throw new Error(message)
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
  ): Promise<{ audioUrl: string; voiceSource?: string }> {
    try {
      const response = await aiClient.post('/voice/generate', {
        text,
        voiceType,
        sceneId,
      })
      const result = response as any
      if (!result?.audioUrl) {
        throw new Error('配音服务未返回音频地址')
      }
      return result
    } catch (error: any) {
      console.warn('配音生成失败', error)
      const message = this.getErrorMessage(error, '配音生成失败')
      throw new Error(message)
    }
  }

  /**
   * 合成最终视频
   */
  async synthesizeVideo(params: {
    projectId?: string
    scenes: Array<{ order: number; videoUrl: string; duration?: number }>
  }): Promise<{ videoUrl: string; skippedClips?: string[]; warning?: string }> {
    try {
      const response = await aiClient.post('/video/synthesize', {
        projectId: params.projectId,
        scenes: params.scenes,
      }, {
        timeout: 10 * 60 * 1000,
      })
      return response as any
    } catch (error: any) {
      const code = error?.code
      const rawMessage = this.getErrorMessage(error, '视频合成失败')
      const message =
        code === 'ECONNABORTED' || String(rawMessage).toLowerCase().includes('timeout')
          ? '视频合成超时（已等待较长时间），请重试或减少分镜数量后再试'
          : rawMessage
      console.warn('视频合成失败', error)
      throw new Error(message)
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

}

export const aiService = new AIService()
