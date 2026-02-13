# Babelark AI 集成使用说明

## 📋 概述

动漫工坊现已集成 Babelark AI 聚合平台，支持：
- ✅ **文本生成**: Gemini 3 Flash（100万上下文，快速响应）
- ✅ **图片生成**: Gemini 3 Pro Image（高质量动漫风格图片）
- ✅ **视频生成**: Doubao Seedance 1.5 Pro（图生视频，5秒/段，720P 竖屏）
- ✅ **备用视频**: 阿里通义万相 Wan2.6（可选）

## 🚀 快速开始

### 1. 注册 Babelark 账号

访问 [Babelark 官网](https://www.babelark.com) 注册账号。

### 2. 获取 API Key

1. 登录后进入 [控制台](https://www.babelark.com/console)
2. 点击「创建 Token」
3. 复制生成的 API Key（格式: `sk-xxxxx`）

### 3. 配置环境变量

编辑 `ai-service/.env` 文件：

```bash
AI_PROVIDER=babelark
BABELARK_API_KEY=sk-your-actual-api-key-here
```

### 4. 启动 AI 服务

```bash
cd ai-service
python -m app.main
```

服务启动后访问 http://localhost:8000/docs 查看 API 文档。

## 🎬 工作流程

### 完整流程：文本 → 分镜 → 图片 → 视频 → 合成

```
用户输入文字描述
    ↓
Gemini 3 Flash 生成5个分镜脚本
    ↓
用户编辑/调整分镜（拖拽排序、修改描述）
    ↓
Gemini 3 Pro Image 逐个生成分镜图片
    ↓
Doubao Seedance 1.5 Pro 图生视频（异步任务）
    ↓
前端合成最终视频（加转场、音乐）
```

## 🔧 API 使用示例

### 1. 生成分镜脚本

```http
POST http://localhost:8000/ai/storyboard/generate
Content-Type: application/json

{
  "prompt": "一只猫在追逐蝴蝶",
  "style": "japanese",
  "sceneCount": 5
}
```

### 2. 生成分镜图片

```http
POST http://localhost:8000/ai/image/generate
Content-Type: application/json

{
  "description": "一只橘猫在花园里追逐着彩色蝴蝶",
  "style": "japanese",
  "resolution": {
    "width": 1080,
    "height": 1920
  }
}
```

### 3. 生成视频（图生视频）

```http
POST http://localhost:8000/ai/video/generate
Content-Type: application/json

{
  "prompt": "猫咪跳跃着追逐蝴蝶，蝴蝶飞舞躲闪",
  "imageUrl": "https://example.com/scene-1.png",
  "duration": 5,
  "resolution": "720P",
  "aspectRatio": "9:16",
  "useAliModel": false
}
```

**响应**:
```json
{
  "taskId": "abc123",
  "status": "queued",
  "createdAt": 1234567890
}
```

### 4. 查询视频生成状态

```http
POST http://localhost:8000/ai/video/status
Content-Type: application/json

{
  "taskId": "abc123",
  "useAliModel": false
}
```

**响应**:
```json
{
  "taskId": "abc123",
  "status": "completed",
  "progress": 100,
  "videoUrl": "https://example.com/video.mp4"
}
```

状态值：
- `queued` - 排队中
- `processing` - 生成中
- `completed` - 已完成
- `failed` - 失败

## 💰 成本估算

基于 Babelark 定价（参考值）：

### 文本生成
- Gemini 3 Flash: $0.50/1M input tokens, $3.00/1M output tokens
- 单次生成5个分镜脚本: ~$0.002

### 图片生成
- Gemini 3 Pro Image: 价格待确认
- 单张 1080x1920 图片: ~$0.05

### 视频生成
- Doubao Seedance 1.5 Pro: $0.09/秒 (基础)
- 720P: 2.16x 倍率
- 9:16 竖屏 5秒视频: $0.09 × 2.16 × 5 = $0.972

**完整流程成本** (5个分镜):
- 分镜脚本: $0.002
- 图片生成: $0.25 (5张)
- 视频生成: $4.86 (5段)
- **总计**: ~$5.11

## 🔀 模型切换

### 使用阿里通义万相（备用）

编辑请求，设置 `useAliModel: true`:

```json
{
  "prompt": "猫咪追逐蝴蝶",
  "imageUrl": "https://example.com/scene.png",
  "duration": 5,
  "resolution": "720P",
  "useAliModel": true
}
```

### 切换回 Mock 模式（测试）

修改 `.env`:
```bash
AI_PROVIDER=mock
```

## 🎨 前端集成

### 场景视频生成

```typescript
import { aiService } from '@/services/ai'

// 生成视频
const result = await aiService.generateVideoFromImage({
  prompt: scene.description,
  imageUrl: scene.imageUrl,
  duration: 5,
  resolution: '720P',
  aspectRatio: '9:16',
  useAliModel: false
})

// 轮询状态
const videoUrl = await aiService.pollVideoGeneration(
  result.taskId,
  false,
  60,  // 最多60次
  5000 // 每5秒轮询一次
)

// 更新场景
scene.videoUrl = videoUrl
scene.videoStatus = 'generated'
```

## 📊 监控与调试

### 查看 AI 服务日志

```bash
cd ai-service
python -m app.main
```

### 查看 Swagger 文档

访问 http://localhost:8000/docs 查看完整 API 文档。

### 常见问题

**Q: 视频生成一直是 `processing` 状态？**

A: Doubao Seedance 视频生成通常需要 30-120 秒，请耐心等待。前端默认轮询60次（5分钟）。

**Q: 报错 "当前AI适配器不支持视频生成功能"？**

A: 请确认 `.env` 中 `AI_PROVIDER=babelark`，Mock 模式不支持真实视频生成。

**Q: API Key 无效？**

A: 检查 API Key 格式是否为 `sk-xxxxx`，并确认在 Babelark 控制台中 Token 状态为启用。

**Q: 想切换到其他图片/视频模型？**

A: 修改 `.env` 中的模型名称：
```bash
BABELARK_IMAGE_MODEL=doubao-seedream-4-5
BABELARK_VIDEO_MODEL=wan2.6-i2v
```

## 🔐 安全提示

- ⚠️ 不要将 `.env` 文件提交到 Git 仓库
- ⚠️ API Key 具有计费权限，请妥善保管
- ⚠️ 生产环境建议使用环境变量或密钥管理服务

## 📚 参考资源

- [Babelark 官网](https://www.babelark.com)
- [Babelark 文档](https://www.babelark.com/doc)
- [Babelark 模型列表](https://www.babelark.com/models)
- [控制台](https://www.babelark.com/console)

---

✨ **Happy Creating!**
