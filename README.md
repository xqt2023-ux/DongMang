# 动漫工坊 - AI动漫短视频制作工具

## 📋 项目概述

AI驱动的动漫短视频制作Web工具。用户输入文字描述，AI自动生成分镜脚本和动漫画面，前端合成15秒短视频。

## 🏗️ 技术架构

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Frontend       │     │    Backend        │     │    AI Service     │
│  Vue3 + TS + Vite│────▶│  NestJS           │     │  FastAPI          │
│  PixiJS + GSAP   │     │  Port: 4000       │     │  Port: 8000       │
│  Port: 3000      │────▶│                   │     │  可插拔AI适配器   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 前端 (frontend/)
- **Vue 3** + **TypeScript** + **Vite**
- **Element Plus** - UI组件库
- **Pinia** - 状态管理
- **PixiJS** - 2D动画渲染引擎
- **GSAP** - 动画库
- **FFmpeg.wasm** - 前端视频导出

### 后端 (backend/)
- **NestJS** - 主业务服务（项目管理）
- **Swagger** - API文档自动生成

### AI服务 (ai-service/)
- **FastAPI** - AI接口服务
- **可插拔适配器** - 支持切换不同AI提供商
  - **Babelark** (推荐) - AI API 聚合平台
    - 文本生成: Gemini 3 Flash / DeepSeek V3.2
    - 图片生成: Gemini 3 Pro Image / Doubao Seedream 4.5
    - 视频生成: Doubao Seedance 1.5 Pro / 阿里通义万相 Wan2.6
  - OpenAI (GPT-4 + DALL-E 3)
  - Mock (开发测试用)
  - 扩展: Stable Diffusion, Midjourney 等

## 🚀 快速开始

### 前置要求
- Node.js >= 18
- Python >= 3.10
- pnpm (推荐) 或 npm

### 1. 前端

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

### 2. 后端

```bash
cd backend
npm install
npm run dev
# API: http://localhost:4000
# 文档: http://localhost:4000/api/docs
```

### 3. AI服务

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 配置 Babelark API Key
# 1. 访问 https://www.babelark.com/console 获取 API Key
# 2. 在 .env 中设置 AI_PROVIDER=babelark
# 3. 填入 BABELARK_API_KEY=sk-your-key-here
python -m app.main
# API: http://localhost:8000
```

#### Babelark 配置说明

1. **注册账号**: 访问 [Babelark](https://www.babelark.com) 注册账号
2. **获取 API Key**: 在 [控制台](https://www.babelark.com/console) 创建 API Token
3. **配置模型**:
   - 文本模型: `gemini-3-flash-preview` (100万上下文，性价比高)
   - 图片模型: `gemini-3-pro-image-preview` (高质量图片生成)
   - 视频模型: `doubao-seedance-1-5-pro` (图生视频，5秒/段，720P)
   - 备用视频: `wan2.6-i2v` (阿里通义万相)

#### 模型切换

修改 `.env` 中的 `AI_PROVIDER`：
- `babelark` - 使用 Babelark 聚合平台（推荐）
- `openai` - 使用 OpenAI 官方 API
- `mock` - 使用 Mock 数据（开发测试）

## 📱 MVP 功能

- [x] 文字描述 → AI生成5个分镜脚本
- [x] 分镜编辑（修改描述、拖拽排序、删除/新增）
- [x] AI逐镜头生成动漫画面
- [x] **AI图生视频** - Babelark 视频生成（Doubao Seedance / 阿里万相）
- [x] 6种动漫风格切换
- [x] 3种基础转场效果
- [x] 上传背景音乐
- [x] 前端视频预览
- [x] 导出MP4视频

## 🔮 后续迭代

- [ ] 完善视频生成流程（一键生成所有分镜视频）
- [ ] 视频生成进度可视化
- [ ] 故事模板模式
- [ ] 预设角色库 + 自定义角色
- [ ] 预设场景库
- [ ] AI配音（多角色对话 + 旁白）
- [ ] 更多转场效果
- [ ] 用户注册/登录
- [ ] 项目云端保存
- [ ] 移动端适配
