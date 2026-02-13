/**
 * 动漫工坊 - 核心类型定义
 * 对标纳米漫剧流水线 7 步工作流
 */

// ==================== 7 步工作流 ====================
export type WorkflowStep =
  | 'global-settings'   // 1. 全局设定
  | 'story-script'      // 2. 故事剧本
  | 'scene-assets'      // 3. 场景角色道具
  | 'storyboard'        // 4. 分镜脚本
  | 'storyboard-video'  // 5. 分镜视频
  | 'voice-lipsync'     // 6. 配音对口型
  | 'video-preview'     // 7. 视频预览

export const WORKFLOW_STEPS: { key: WorkflowStep; label: string; order: number }[] = [
  { key: 'global-settings',  label: '全局设定',     order: 1 },
  { key: 'story-script',     label: '故事剧本',     order: 2 },
  { key: 'scene-assets',     label: '场景角色道具', order: 3 },
  { key: 'storyboard',       label: '分镜脚本',     order: 4 },
  { key: 'storyboard-video', label: '分镜视频',     order: 5 },
  { key: 'voice-lipsync',    label: '配音对口型',   order: 6 },
  { key: 'video-preview',    label: '视频预览',     order: 7 },
]

// ==================== 故事类型 ====================
export type StoryType =
  | 'ancient-hero'      // 古代英雄传奇
  | 'sci-fi'            // 科幻
  | 'suspense-horror'   // 悬疑恐怖
  | 'wuxia-fantasy'     // 武侠奇幻
  | 'romance'           // 言情
  | 'comedy'            // 喜剧
  | 'mythology'         // 神话传说
  | 'modern-urban'      // 现代都市
  | 'mecha'             // 机甲
  | 'custom'            // 自定义

export const STORY_TYPES: { key: StoryType; label: string }[] = [
  { key: 'ancient-hero',    label: '古代英雄传奇' },
  { key: 'sci-fi',          label: '科幻' },
  { key: 'suspense-horror', label: '悬疑恐怖' },
  { key: 'wuxia-fantasy',   label: '武侠奇幻' },
  { key: 'romance',         label: '言情' },
  { key: 'comedy',          label: '喜剧' },
  { key: 'mythology',       label: '神话传说' },
  { key: 'modern-urban',    label: '现代都市' },
  { key: 'mecha',           label: '机甲' },
  { key: 'custom',          label: '自定义' },
]

// ==================== 动漫/画面风格 ====================
export type AnimeStyle =
  | 'japanese'      // 日式动漫
  | 'chinese'       // 国漫
  | 'chibi'         // Q版
  | 'realistic'     // 写实动漫
  | 'watercolor'    // 水彩风
  | 'pixel'         // 像素风
  | 'cinematic'     // 电影质感
  | 'ink-wash'      // 水墨风

// ==================== 画面比例 ====================
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3'

export const ASPECT_RATIOS: { key: AspectRatio; label: string; width: number; height: number }[] = [
  { key: '16:9', label: '横屏 16:9', width: 1920, height: 1080 },
  { key: '9:16', label: '竖屏 9:16', width: 1080, height: 1920 },
  { key: '1:1',  label: '方形 1:1',  width: 1080, height: 1080 },
  { key: '4:3',  label: '经典 4:3',  width: 1440, height: 1080 },
]

// ==================== 转场效果 ====================
export type TransitionType =
  | 'fade'          // 淡入淡出
  | 'slide-left'    // 左滑
  | 'slide-right'   // 右滑
  | 'zoom-in'       // 缩放进入
  | 'zoom-out'      // 缩放退出
  | 'dissolve'      // 溶解
  | 'wipe'          // 擦除
  | 'none'          // 无转场

// ==================== 全局设定 ====================
export interface GlobalSettings {
  storyType: StoryType
  customStoryType?: string
  animeStyle: AnimeStyle
  aspectRatio: AspectRatio
  tone: string                   // 整体基调描述
}

// ==================== 项目 ====================
export interface Project {
  id: string
  title: string
  description: string            // 故事梗概
  globalSettings: GlobalSettings
  script: string                 // 故事剧本全文
  roles: Role[]                  // 角色列表
  props: Prop[]                  // 道具列表
  sceneBackgrounds: SceneBackground[]  // 场景背景列表
  scenes: Scene[]                // 分镜列表
  audioTrack: AudioTrack | null
  voiceTracks: VoiceTrack[]      // 配音轨道
  duration: number               // 总时长（秒）
  resolution: Resolution
  status: ProjectStatus
  coverUrl: string               // 封面图
  videoUrl: string               // 最终成片 URL
  shareToken: string             // 分享码
  createdAt: string
  updatedAt: string
}

export type ProjectStatus =
  | 'draft'          // 草稿
  | 'scripting'      // 编写剧本中
  | 'assets-ready'   // 素材就绪
  | 'storyboarding'  // 分镜编排中
  | 'video-generating' // 视频生成中
  | 'voicing'        // 配音中
  | 'preview'        // 预览
  | 'exporting'      // 导出中
  | 'published'      // 已发布

export interface Resolution {
  width: number
  height: number
}

// ==================== 角色 ====================
export interface Role {
  id: string
  name: string
  description: string            // 角色描述
  avatarUrl: string              // 角色头像/立绘
  voiceId?: string               // 关联语音角色
}

// ==================== 道具 ====================
export interface Prop {
  id: string
  name: string
  description: string
  imageUrl: string
}

// ==================== 场景背景 ====================
export interface SceneBackground {
  id: string
  name: string
  description: string
  imageUrl: string
}

// ==================== 分镜/场景 ====================
export interface Scene {
  id: string
  order: number                  // 场景顺序
  description: string            // 场景描述文字（分镜脚本）
  imageUrl: string               // AI生成的分镜图片URL
  videoUrl: string               // AI生成的分镜视频URL
  thumbnailUrl: string           // 缩略图
  duration: number               // 场景时长（秒）
  transition: TransitionType     // 到下一个场景的转场效果
  roleIds: string[]              // 出场角色ID列表
  dialogue: Dialogue | null      // 对话/旁白
  narration: string              // 旁白文字
  cameraMovement: CameraMovement // 镜头运动
  backgroundId?: string          // 关联场景背景
  status: SceneStatus
  videoStatus: VideoGenStatus
}

export type SceneStatus = 'pending' | 'generating' | 'generated' | 'error'
export type VideoGenStatus = 'pending' | 'queued' | 'generating' | 'generated' | 'error'

export interface CameraMovement {
  type: 'static' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'zoom-in' | 'zoom-out'
  speed: number               // 0-1
}

// ==================== 对话/旁白 ====================
export interface Dialogue {
  type: 'dialogue' | 'narration'
  roleId?: string              // 对话时关联角色
  text: string                 // 对话/旁白文字
  voiceConfig?: VoiceConfig    // 语音配置
}

export interface VoiceConfig {
  provider: string
  voiceId: string
  speed: number
  pitch: number
  emotion?: string             // 情感类型
}

// ==================== 配音轨道 ====================
export interface VoiceTrack {
  id: string
  sceneId: string
  roleId?: string
  text: string
  audioUrl: string
  duration: number
  startTime: number            // 在视频中的起始时间
}

// ==================== 音频 ====================
export interface AudioTrack {
  id: string
  name: string
  url: string
  duration: number
  volume: number              // 0-1
}

// ==================== 分镜脚本（AI生成） ====================
export interface StoryboardScript {
  title: string
  style: AnimeStyle
  scenes: StoryboardScene[]
}

export interface StoryboardScene {
  order: number
  description: string
  suggestedDuration: number
  suggestedTransition: TransitionType
  suggestedCameraMovement: CameraMovement
  characters: string[]        // 角色名称列表
  dialogue: {
    type: 'dialogue' | 'narration'
    speaker?: string
    text: string
  } | null
}

// ==================== AI 服务相关 ====================
export interface AIGenerateRequest {
  prompt: string
  style: AnimeStyle
  sceneCount?: number
}

export interface AIImageRequest {
  description: string
  style: AnimeStyle
  resolution: Resolution
  referenceImages?: string[]
}

// ==================== 视频生成相关 ====================
export interface AIVideoGenerateRequest {
  prompt: string
  imageUrl?: string            // 可选，图生视频模式需要
  duration?: number            // 1-10秒，默认5秒
  resolution?: '480P' | '720P' | '1080P'  // 默认720P
  aspectRatio?: '1:1' | '16:9' | '9:16' | '21:9' | '4:3' | '3:4'  // 默认9:16
  useAliModel?: boolean        // 是否使用阿里云模型，默认false
}

export interface AIVideoGenerateResponse {
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt?: number
}

export interface AIVideoStatusRequest {
  taskId: string
  useAliModel?: boolean
}

export interface AIVideoStatusResponse {
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number             // 0-100
  videoUrl?: string            // 完成后返回
}

export interface AIVideoRequest {
  imageUrl: string             // 首帧图片
  description: string          // 运动描述
  duration: number             // 视频时长（秒）
  model: string                // 视频模型名称
}

export interface AIProviderConfig {
  provider: string
  apiKey: string
  baseUrl?: string
  model?: string
}

// ==================== 视频导出 ====================
export interface ExportConfig {
  format: 'mp4' | 'webm'
  quality: 'low' | 'medium' | 'high'
  resolution: Resolution
  fps: number
  includeSubtitles: boolean
  includeBGM: boolean
}

export interface ExportProgress {
  status: 'preparing' | 'rendering' | 'encoding' | 'completed' | 'error'
  progress: number            // 0-100
  currentScene: number
  totalScenes: number
  message: string
}

// ==================== 案例广场 ====================
export interface PublishedWork {
  id: string
  title: string
  summary: string
  storyType: string
  coverUrl: string
  videoUrl: string
  shareToken: string
  authorName: string
  authorAvatar: string
  roles: { id: string; name: string; avatarUrl: string }[]
  score: number
  createdAt: string
  updatedAt: string
}

// ==================== 资产库 ====================
export type AssetType = 'role' | 'prop' | 'scene' | 'expression' | 'effect' | 'font'

export interface Asset {
  id: string
  type: AssetType
  name: string
  description: string
  imageUrl: string
  tags: string[]
  isPublic: boolean
  createdAt: string
}
