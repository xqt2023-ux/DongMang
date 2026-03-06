# 动漫工坊（DongMang）设计文档

> 版本：0.1.0 · 最后更新：2026-03

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [前端设计](#3-前端设计)
4. [后端设计](#4-后端设计)
5. [AI 服务设计](#5-ai-服务设计)
6. [数据库设计](#6-数据库设计)
7. [API 接口设计](#7-api-接口设计)
8. [核心业务流程](#8-核心业务流程)
9. [数据模型](#9-数据模型)
10. [状态管理](#10-状态管理)
11. [部署与运行环境](#11-部署与运行环境)

---

## 1. 项目概述

### 1.1 产品定位

**动漫工坊**是一款 AI 驱动的动漫短视频制作 Web 工具。用户只需输入文字故事描述，即可由 AI 自动完成分镜脚本生成、动漫画面绘制、视频合成，并可添加 AI 配音，最终导出 MP4 短视频。

核心价值主张：**三倍速出片，电影级质感**。

### 1.2 主要功能（MVP）

| 功能 | 说明 |
|------|------|
| 故事梗概 → AI 剧本 | 用户输入梗概，AI 生成完整剧本 |
| AI 分镜脚本生成 | 将剧本分解为 5～12 个带镜头描述的分镜 |
| 场景/角色/道具提取 | 从剧本中自动提取并生成图片资产 |
| AI 分镜图片生成 | 每个分镜调用 AI 生成对应动漫画面 |
| AI 图生视频 | 以分镜图为首帧，AI 生成短视频片段 |
| AI 配音生成 | 为场景台词生成 TTS 配音轨道 |
| 背景音乐上传 | 用户上传 BGM，与视频合并 |
| 前端视频预览与导出 | 浏览器内合成并导出 MP4 |
| 案例广场 | 浏览与分享已发布的作品 |
| 资产库 | 管理角色、道具、场景等可复用素材 |

### 1.3 当前阶段

MVP 完成度约 80%；部分高级功能（AI 配音精细化、移动端适配、用户注册登录）规划在后续迭代中。

---

## 2. 系统架构

### 2.1 三层架构总览

```
┌─────────────────────────────────────────────────────────┐
│                       用户浏览器                          │
│       Vue 3 + TypeScript + Vite (Port: 3000)             │
│  PixiJS · GSAP · FFmpeg.wasm · Element Plus · Pinia     │
└────────────────┬───────────────────────────┬────────────┘
                 │  HTTP /api/*              │  HTTP /ai/*
                 ▼                           ▼
┌───────────────────────┐      ┌───────────────────────────┐
│       后端服务          │      │        AI 服务              │
│  NestJS (Port: 4000)  │      │  FastAPI (Port: 8000)      │
│  better-sqlite3 (本地) │      │  可插拔 AI 适配器层          │
└───────────────────────┘      └────────────┬──────────────┘
                                            │ HTTPS
                              ┌─────────────▼──────────────┐
                              │       外部 AI 提供商          │
                              │  Babelark / OpenAI / Mock   │
                              └────────────────────────────┘
```

### 2.2 服务职责划分

| 服务 | 端口 | 职责 |
|------|------|------|
| 前端（frontend） | 3000 | UI 渲染、7 步创作工作流、浏览器内视频合成 |
| 后端（backend） | 4000 | 项目 CRUD、持久化、资产管理 REST API |
| AI 服务（ai-service） | 8000 | 文本生成、图片生成、视频生成、配音生成 |

### 2.3 请求代理约定

前端通过 Vite 开发代理将路径前缀路由到对应服务：

- `/api/*` → `http://localhost:4000/api/*`（后端）
- `/ai/*` → `http://localhost:8000/*`（AI 服务）

---

## 3. 前端设计

### 3.1 技术栈

| 类别 | 技术选型 |
|------|---------|
| 框架 | Vue 3（Composition API） + TypeScript |
| 构建工具 | Vite |
| UI 组件库 | Element Plus（中文语言包） |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 动画渲染 | PixiJS（2D 动画引擎） + GSAP |
| 视频导出 | FFmpeg.wasm（浏览器内编码） |
| HTTP 客户端 | Axios |
| 样式 | SCSS（scoped） |

### 3.2 目录结构

```
frontend/src/
├── main.ts              # 应用入口，注册插件
├── App.vue              # 根组件（导航栏 + router-view）
├── router/
│   └── index.ts         # 路由定义，7 步工作流嵌套路由
├── stores/
│   └── project.ts       # 项目全局状态（Pinia Store）
├── services/
│   ├── api.ts           # Axios 实例（apiClient / aiClient）
│   ├── ai.ts            # AI 服务调用封装
│   ├── project.ts       # 项目 CRUD 封装
│   └── asset.ts         # 资产管理封装
├── types/
│   └── index.ts         # 所有 TypeScript 类型定义
├── views/
│   ├── HomeView.vue      # 首页（Hero + 用户作品展示）
│   ├── GalleryView.vue   # 案例广场
│   ├── MyWorksView.vue   # 我的作品
│   ├── AssetsView.vue    # 资产库
│   └── editor/          # 7 步创作编辑器
│       ├── EditorLayout.vue          # 编辑器外壳（步骤导航）
│       ├── GlobalSettingsView.vue    # 步骤 1：全局设定
│       ├── StoryScriptView.vue       # 步骤 2：故事剧本
│       ├── SceneAssetsView.vue       # 步骤 3：场景角色道具
│       ├── StoryboardView.vue        # 步骤 4：分镜脚本
│       ├── StoryboardVideoView.vue   # 步骤 5：分镜视频
│       ├── VoiceLipsyncView.vue      # 步骤 6：配音对口型
│       └── VideoPreviewView.vue      # 步骤 7：视频预览导出
├── components/          # 通用组件
└── styles/
    └── main.scss        # 全局样式
```

### 3.3 路由设计

所有创作工作流路由均嵌套在 `/editor/:id` 路由下，`:id` 为项目 UUID。

```
/                          → HomeView（首页）
/gallery                   → GalleryView（案例广场）
/my-works                  → MyWorksView（我的作品）
/assets                    → AssetsView（资产库）

/editor/:id                → EditorLayout（重定向到 global-settings）
  /editor/:id/global-settings    → Step 1 全局设定
  /editor/:id/story-script       → Step 2 故事剧本
  /editor/:id/scene-assets       → Step 3 场景角色道具
  /editor/:id/storyboard         → Step 4 分镜脚本
  /editor/:id/storyboard-video   → Step 5 分镜视频
  /editor/:id/voice-lipsync      → Step 6 配音对口型
  /editor/:id/video-preview      → Step 7 视频预览
```

**路由守卫行为：**

- 进入编辑器时，自动从后端加载项目数据。
- 离开编辑器（包括切换步骤）时，自动保存当前项目到后端。

### 3.4 HTTP 客户端

`services/api.ts` 中导出两个 Axios 实例：

| 实例 | baseURL | 超时 | 用途 |
|------|---------|------|------|
| `apiClient` | `/api` | 30s | 后端业务接口 |
| `aiClient` | `/ai` | 120s | AI 服务接口（生成任务耗时较长） |

两者均配置响应拦截器，统一提取错误信息并向上抛出。

---

## 4. 后端设计

### 4.1 技术栈

| 类别 | 技术选型 |
|------|---------|
| 框架 | NestJS |
| 语言 | TypeScript |
| 数据库 | SQLite（better-sqlite3，本地文件） |
| 文档 | Swagger / OpenAPI（自动生成） |
| 验证 | class-validator + ValidationPipe |

### 4.2 目录结构

```
backend/src/
├── main.ts              # 启动引导（监听 4000 端口）
├── app.module.ts        # 根模块，导入各子模块
├── database/
│   ├── database.module.ts   # DatabaseModule
│   └── database.service.ts  # SQLite 连接 + 建表
└── modules/
    ├── project/
    │   ├── project.module.ts
    │   ├── project.controller.ts  # REST 控制器
    │   ├── project.service.ts     # 业务逻辑
    │   └── project.dto.ts         # DTO 及 Entity 类型
    └── asset/                     # 资产管理模块（规划中）
```

### 4.3 项目模块（ProjectModule）

#### 控制器端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/projects` | 创建新项目 |
| `GET` | `/api/projects` | 获取所有项目列表 |
| `GET` | `/api/projects/:id` | 获取项目详情 |
| `PUT` | `/api/projects/:id` | 更新项目基本信息 |
| `PUT` | `/api/projects/:id/full` | 保存项目完整状态（全量替换） |
| `DELETE` | `/api/projects/:id` | 删除项目 |
| `PATCH` | `/api/projects/:id/global-settings` | 更新全局设定 |
| `POST` | `/api/projects/:id/roles` | 添加角色 |
| `DELETE` | `/api/projects/:id/roles/:roleId` | 删除角色 |
| `POST` | `/api/projects/:id/scenes` | 添加场景 |
| `PATCH` | `/api/projects/:id/scenes/:sceneId` | 更新场景 |
| `DELETE` | `/api/projects/:id/scenes/:sceneId` | 删除场景 |
| `POST` | `/api/projects/:id/props` | 添加道具 |
| `POST` | `/api/projects/:id/backgrounds` | 添加场景背景 |
| `POST` | `/api/projects/:id/voice-tracks` | 添加配音轨道 |

#### 全量保存策略（`PUT /full`）

`saveFull` 方法使用 SQLite 事务：先删除项目关联的所有子数据（角色、场景、道具、背景、配音），再按前端传入数据重新插入，保证前后端状态严格一致。

### 4.4 DatabaseService

- 数据库文件路径：`./data/dongmang.sqlite`（相对于后端工作目录）
- 启用 `WAL` 日志模式（提高并发读性能）和外键约束
- `onModuleInit` 时自动执行 `CREATE TABLE IF NOT EXISTS` 建表 SQL
- 支持增量迁移（检测列是否存在后执行 `ALTER TABLE`）

---

## 5. AI 服务设计

### 5.1 技术栈

| 类别 | 技术选型 |
|------|---------|
| 框架 | FastAPI |
| 语言 | Python 3.10+ |
| 数据验证 | Pydantic v2 |
| HTTP 客户端 | httpx（异步） |
| 静态文件 | FastAPI StaticFiles（`/generated` 目录） |

### 5.2 目录结构

```
ai-service/
├── app/
│   ├── main.py              # FastAPI 应用入口（端口 8000）
│   ├── api/
│   │   ├── health.py        # 健康检查
│   │   ├── storyboard.py    # 剧本/分镜脚本生成
│   │   ├── image.py         # 图片生成
│   │   ├── video.py         # 视频生成与状态查询
│   │   └── voice.py         # 配音生成
│   ├── models/
│   │   └── schemas.py       # Pydantic 请求/响应模型
│   └── services/
│       └── ai_adapter.py    # 可插拔 AI 适配器层
├── generated/               # AI 生成文件的静态托管目录
├── requirements.txt
└── .env.example
```

### 5.3 可插拔 AI 适配器

```
AIAdapter（ABC 抽象基类）
├── generate_text(prompt, system_prompt) → str
├── generate_image(prompt, size, reference_images) → str（URL）
├── translate_to_english(chinese_text) → str（可选实现）
├── generate_video(prompt, image_url, ...) → dict
└── get_video_status(task_id) → dict

├── OpenAIAdapter      （OpenAI GPT-4 + DALL-E 3）
├── BabelarkAdapter    （Babelark 聚合平台，推荐）
└── MockAdapter        （开发/测试 Mock 数据）
```

通过环境变量 `AI_PROVIDER=babelark|openai|mock` 在运行时动态选择适配器：

```python
def get_ai_adapter() -> AIAdapter:
    provider = os.getenv("AI_PROVIDER", "mock")
    if provider == "babelark":
        return BabelarkAdapter()
    elif provider == "openai":
        return OpenAIAdapter()
    return MockAdapter()
```

### 5.4 BabelarkAdapter 模型配置

| 功能 | 主模型 | 备用模型 |
|------|--------|---------|
| 文本生成 | `gemini-3-flash-preview` | `gemini-2.5-flash` |
| 图片生成 | `gemini-3-pro-image-preview` | `doubao-seedream-4-5`，`gemini-2.5-flash-image` |
| 视频生成 | `doubao-seedance-1-5-pro` | `wan2.6-i2v`（阿里云模型） |

主模型调用失败时自动顺序尝试备用模型（容灾降级机制）。

### 5.5 API 端点总览

| 前缀 | 端点 | 说明 |
|------|------|------|
| `/health` | `GET /` | 健康检查 |
| `/storyboard` | `POST /generate-script` | 故事梗概 → 完整剧本 |
| `/storyboard` | `POST /generate` | 剧本 → 分镜脚本（JSON） |
| `/storyboard` | `POST /regenerate-scene` | 重新生成单个分镜描述 |
| `/storyboard` | `POST /extract-assets` | 从剧本提取场景/角色/道具 |
| `/image` | `POST /generate` | 分镜图片生成 |
| `/image` | `POST /generate-role` | 角色立绘生成 |
| `/image` | `POST /generate-background` | 场景背景图生成 |
| `/image` | `POST /generate-prop` | 道具图片生成 |
| `/video` | `POST /generate` | 提交视频生成任务 |
| `/video` | `GET /status/{task_id}` | 查询视频生成状态 |
| `/voice` | `POST /generate` | 生成 TTS 配音 |

### 5.6 分镜脚本兜底机制

当上游 AI 模型不可用（返回 `no available channel`、5xx 错误等）时，`storyboard.py` 会自动启用本地模板兜底：

1. 解析故事提示词为若干"故事节拍"（story beats）
2. 按场景数量扩展节拍列表（不足时按叙事阶段提示词填充）
3. 使用固定模板构造 `StoryboardScript` 对象返回，而不是报错

---

## 6. 数据库设计

数据库采用 SQLite，文件存储于后端工作目录 `./data/dongmang.sqlite`。

### 6.1 ER 图（简化）

```
projects (1) ─────< roles (N)
projects (1) ─────< scenes (N)
projects (1) ─────< props (N)
projects (1) ─────< scene_backgrounds (N)
projects (1) ─────< voice_tracks (N)
scenes (N) >───────< roles (N)   [通过 scene_roles 中间表]
```

### 6.2 表结构

#### `projects`

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | UUID |
| `title` | TEXT | 项目标题 |
| `description` | TEXT | 故事梗概 |
| `script` | TEXT | 完整剧本文本 |
| `status` | TEXT | 项目状态（见下方枚举） |
| `cover_url` | TEXT | 封面图 URL |
| `video_url` | TEXT | 最终成片 URL |
| `share_token` | TEXT | 分享码 |
| `gs_story_type` | TEXT | 全局设定：故事类型 |
| `gs_custom_story_type` | TEXT | 全局设定：自定义故事类型 |
| `gs_anime_style` | TEXT | 全局设定：动漫风格 |
| `gs_aspect_ratio` | TEXT | 全局设定：画面比例 |
| `gs_tone` | TEXT | 全局设定：整体基调 |
| `created_at` | TEXT | ISO 8601 创建时间 |
| `updated_at` | TEXT | ISO 8601 最后更新时间 |

项目状态枚举：`draft` · `scripting` · `assets-ready` · `storyboarding` · `video-generating` · `voicing` · `preview` · `exporting` · `published`

#### `roles`

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT FK | → projects.id（级联删除） |
| `name` | TEXT | 角色名 |
| `description` | TEXT | 描述 |
| `avatar_url` | TEXT | 头像/立绘 URL |
| `voice_id` | TEXT | 关联语音角色 ID |
| `role_forms_json` | TEXT | 角色形态列表（JSON） |

#### `scenes`

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT FK | → projects.id（级联删除） |
| `order` | INTEGER | 场景排序序号 |
| `description` | TEXT | 场景描述（分镜脚本） |
| `image_url` | TEXT | AI 生成的分镜图片 URL |
| `video_url` | TEXT | AI 生成的分镜视频 URL |
| `thumbnail_url` | TEXT | 缩略图 URL |
| `duration` | REAL | 场景时长（秒） |
| `transition` | TEXT | 转场效果 |
| `narration` | TEXT | 旁白文字 |
| `background_id` | TEXT | 关联场景背景 ID |
| `camera_type` | TEXT | 镜头运动类型 |
| `camera_speed` | REAL | 镜头运动速度（0～1） |
| `status` | TEXT | 图片生成状态：`pending/generating/generated/error` |
| `video_status` | TEXT | 视频生成状态：`pending/queued/generating/generated/error` |

#### `scene_roles`（中间表）

| 列名 | 类型 | 说明 |
|------|------|------|
| `scene_id` | TEXT FK | → scenes.id（级联删除） |
| `role_id` | TEXT FK | → roles.id（级联删除） |

#### `props` / `scene_backgrounds`

结构相同：`id`、`project_id`（FK）、`name`、`description`、`image_url`

#### `voice_tracks`

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT FK | → projects.id（级联删除） |
| `scene_id` | TEXT | 关联场景 ID |
| `role_id` | TEXT | 关联角色 ID |
| `text` | TEXT | 台词文字 |
| `audio_url` | TEXT | 配音音频 URL |
| `duration` | REAL | 音频时长（秒） |
| `start_time` | REAL | 在视频中的起始时间（秒） |

#### `assets`（通用资产文件存储）

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | UUID |
| `name` | TEXT | 文件名 |
| `mime_type` | TEXT | MIME 类型 |
| `size` | INTEGER | 文件大小（字节） |
| `data` | BLOB | 文件二进制数据 |
| `created_at` | TEXT | 创建时间 |

---

## 7. API 接口设计

### 7.1 后端 API（NestJS，前缀 `/api`）

Swagger 文档在运行时可通过 `http://localhost:4000/api/docs` 访问。

**核心设计原则：**

- 资源嵌套：所有子资源（角色、场景等）均嵌套在 `/api/projects/:id/` 下
- 全量保存：前端通过 `PUT /api/projects/:id/full` 一次性提交完整项目状态，后端使用事务全量替换
- 细粒度更新：单字段更新（如更新场景图片 URL）使用 `PATCH /api/projects/:id/scenes/:sceneId`

### 7.2 AI 服务 API（FastAPI，前缀 `/ai`）

FastAPI 自动生成 Swagger 文档，访问地址：`http://localhost:8000/docs`

**请求/响应数据格式均为 JSON；图片和视频以 URL 形式返回。**

---

## 8. 核心业务流程

### 8.1 7 步创作工作流

```
Step 1 全局设定
  └─ 用户选择故事类型、动漫风格、画面比例、整体基调
     └─ 保存到 projects.gs_*

Step 2 故事剧本
  └─ 用户输入梗概 → 调用 POST /ai/storyboard/generate-script → 返回剧本
     └─ 编辑确认后保存到 projects.script

Step 3 场景角色道具
  └─ 调用 POST /ai/storyboard/extract-assets → 自动识别角色/场景/道具
  └─ 对每个资产调用 POST /ai/image/generate-role 等生成图片
     └─ 保存到 roles / props / scene_backgrounds 表

Step 4 分镜脚本
  └─ 调用 POST /ai/storyboard/generate → 根据剧本生成 5～12 个分镜
  └─ 用户可拖拽排序、编辑描述、删除/新增场景
     └─ 保存到 scenes 表

Step 5 分镜视频
  └─ 为每个分镜调用 POST /ai/image/generate → 生成分镜图片（scenes.image_url）
  └─ 调用 POST /ai/video/generate → 提交图生视频任务（scenes.video_status = queued）
  └─ 轮询 GET /ai/video/status/:taskId → 任务完成后写入 scenes.video_url

Step 6 配音对口型
  └─ 对有台词的场景调用 POST /ai/voice/generate → 生成 TTS 音频（voice_tracks.audio_url）
  └─ 用户可批量生成或逐条调整

Step 7 视频预览与导出
  └─ 前端使用 PixiJS + GSAP 按顺序渲染分镜视频片段 + 转场 + BGM + 配音
  └─ 调用 FFmpeg.wasm 编码为 MP4 并提供下载
```

### 8.2 自动保存机制

- 监听 `currentProject`（深层 watch），在无保存中状态时，延迟 1.5 秒触发 `saveCurrentProject()`（防抖）
- 路由切换时（离开编辑器步骤），路由守卫额外触发一次强制保存
- 保存失败时仅弹出警告，不阻断导航

### 8.3 视频生成异步轮询

视频生成为异步任务（通常耗时 30～120 秒），流程如下：

```
前端 → POST /ai/video/generate → { task_id, status: "queued" }
       ↓ 轮询（每 3 秒）
前端 → GET /ai/video/status/:task_id → { status: "processing", progress: 60 }
       ↓ 完成
前端 → GET /ai/video/status/:task_id → { status: "completed", video_url: "..." }
       ↓
前端 → PATCH /api/projects/:id/scenes/:sceneId → 更新 video_url / video_status
```

---

## 9. 数据模型

### 9.1 核心类型（TypeScript，位于 `frontend/src/types/index.ts`）

```typescript
interface Project {
  id: string
  title: string
  description: string        // 故事梗概
  globalSettings: GlobalSettings
  script: string             // 完整剧本
  roles: Role[]
  props: Prop[]
  sceneBackgrounds: SceneBackground[]
  scenes: Scene[]
  audioTrack: AudioTrack | null
  voiceTracks: VoiceTrack[]
  status: ProjectStatus
  coverUrl: string
  videoUrl: string
  shareToken: string
  createdAt: string
  updatedAt: string
}

interface Scene {
  id: string
  order: number
  description: string        // 分镜脚本描述
  imageUrl: string           // AI 分镜图片
  videoUrl: string           // AI 分镜视频
  duration: number           // 秒
  transition: TransitionType
  cameraMovement: CameraMovement
  roleIds: string[]
  dialogue: Dialogue | null
  narration: string
  status: SceneStatus        // 图片生成状态
  videoStatus: VideoGenStatus
}
```

### 9.2 枚举类型

| 类型 | 可选值 |
|------|--------|
| `AnimeStyle` | `japanese` · `chinese` · `chibi` · `realistic` · `watercolor` · `pixel` · `cinematic` · `ink-wash` |
| `StoryType` | `ancient-hero` · `sci-fi` · `suspense-horror` · `wuxia-fantasy` · `romance` · `comedy` · `mythology` · `modern-urban` · `mecha` · `custom` |
| `AspectRatio` | `16:9` · `9:16` · `1:1` · `4:3` |
| `TransitionType` | `fade` · `slide-left` · `slide-right` · `zoom-in` · `zoom-out` · `dissolve` · `wipe` · `none` |
| `ProjectStatus` | `draft` · `scripting` · `assets-ready` · `storyboarding` · `video-generating` · `voicing` · `preview` · `exporting` · `published` |
| `SceneStatus` | `pending` · `generating` · `generated` · `error` |
| `VideoGenStatus` | `pending` · `queued` · `generating` · `generated` · `error` |

---

## 10. 状态管理

前端使用 **Pinia** 管理全局状态（`stores/project.ts`）。

### 10.1 Store 结构

```typescript
// State
currentProject: Project | null    // 当前编辑中的项目
projects: Project[]               // 项目列表
isGenerating: boolean             // AI 生成中标志
exportProgress: ExportProgress | null
error: string | null
isHydrating: boolean              // 初始加载标志（防止加载期间触发自动保存）
isSaving: boolean                 // 保存中标志（防重入）

// Getters（computed）
scenes                            // currentProject.scenes 快捷访问
roles                             // currentProject.roles 快捷访问
totalDuration                     // 所有场景时长之和
isReadyForPreview                 // 所有场景均已生成视频

// Actions（主要方法）
loadProject(id)                   // 从后端加载项目
updateGlobalSettings(settings)    // 更新全局设定
updateScript(script)              // 更新剧本
addRole / removeRole / updateRole
addScene / removeScene / updateScene
addVoiceTrack
setCover / setFinalVideo / updateTitle
saveCurrentProject()              // 全量保存到后端（PUT /full）
setExportProgress / clearError
```

### 10.2 响应式自动保存

```
watch(currentProject, { deep: true })
  └─ 条件：非加载中 && 非保存中
     └─ 防抖 1500ms → saveCurrentProject()
```

---

## 11. 部署与运行环境

### 11.1 开发环境

**前置要求：** Node.js >= 18，Python >= 3.10，pnpm（推荐）

```bash
# 前端
cd frontend && npm install && npm run dev   # http://localhost:3000

# 后端
cd backend && npm install && npm run dev    # http://localhost:4000

# AI 服务
cd ai-service
pip install -r requirements.txt
cp .env.example .env                        # 配置 AI_PROVIDER 和 API Key
python -m app.main                          # http://localhost:8000
```

### 11.2 环境变量（AI 服务）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AI_PROVIDER` | 适配器选择：`babelark` / `openai` / `mock` | `mock` |
| `BABELARK_API_KEY` | Babelark API Token | — |
| `BABELARK_BASE_URL` | Babelark API 地址 | `https://api.babelark.com` |
| `BABELARK_TEXT_MODEL` | 文本生成主模型 | `gemini-3-flash-preview` |
| `BABELARK_IMAGE_MODEL` | 图片生成主模型 | `gemini-3-pro-image-preview` |
| `BABELARK_VIDEO_MODEL` | 视频生成主模型 | `doubao-seedance-1-5-pro` |
| `OPENAI_API_KEY` | OpenAI API Key | — |
| `OPENAI_MODEL` | OpenAI 文本模型 | `gpt-4` |
| `OPENAI_IMAGE_MODEL` | OpenAI 图片模型 | `dall-e-3` |

### 11.3 生产部署建议（参考）

```
Nginx（反向代理）
├── /             → 前端静态文件（build 产物）
├── /api/*        → NestJS（4000 端口）
└── /ai/*         → FastAPI（8000 端口，去掉 /ai 前缀）
```

- SQLite 适合单机部署；高并发场景建议迁移至 PostgreSQL
- AI 服务建议独立部署，可水平扩展
- `generated/` 目录建议迁移至对象存储（如 S3、OSS）

### 11.4 Swagger API 文档地址

| 服务 | 地址 |
|------|------|
| 后端（NestJS） | `http://localhost:4000/api/docs` |
| AI 服务（FastAPI） | `http://localhost:8000/docs` |
