# TDD 测试驱动开发实践指南

## 🎯 什么是 TDD？

**测试驱动开发（Test-Driven Development）** 是一种软件开发方法论，核心原则是：**先写测试，再写代码**。

### TDD 三步循环：红 → 绿 → 重构

```
1. 🔴 RED（红）：编写一个失败的测试
   - 明确需求
   - 写测试用例
   - 运行测试（必然失败）

2. 🟢 GREEN（绿）：写最少代码让测试通过
   - 实现功能
   - 只写必需代码
   - 让测试变绿

3. 🔵 REFACTOR（重构）：优化代码
   - 保持测试通过
   - 改进代码质量
   - 消除重复

重复以上步骤，直到功能完成
```

---

## 📁 项目测试结构

```
DongMang/
├── frontend/                    # 前端 - Vue3 + Vitest
│   ├── src/
│   │   ├── services/
│   │   │   ├── ai.ts
│   │   │   └── __tests__/
│   │   │       └── ai.spec.ts     ✅ 服务层测试
│   │   ├── components/
│   │   │   └── __tests__/         ✅ 组件测试
│   │   └── __tests__/
│   │       └── workflow.spec.ts   ✅ 工作流测试
│   ├── package.json
│   └── vite.config.ts            # Vitest 配置
│
├── ai-service/                  # AI服务 - FastAPI + pytest
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   └── models/
│   ├── tests/
│   │   ├── conftest.py           # 测试配置
│   │   ├── test_health.py        ✅ 健康检查
│   │   ├── test_storyboard.py    ✅ 分镜生成
│   │   ├── test_image.py         ✅ 图片生成
│   │   ├── test_video.py         ✅ 视频生成
│   │   └── test_new_features.py  ✅ 新功能
│   └── pytest.ini                # pytest 配置
│
└── backend/                     # 后端 - NestJS + Jest
    ├── src/modules/
    │   └── project/
    │       ├── project.service.spec.ts   ✅ TDD 实践
    │       └── project.controller.spec.ts
    └── package.json
```

---

## 🚀 快速开始

### 1. 前端测试（Vitest）

```bash
# 安装依赖（已完成）
cd frontend
npm install -D vitest @vue/test-utils happy-dom @vitest/ui

# 运行测试
npm test                # 运行所有测试
npm run test:watch      # 监听模式
npm run test:ui         # UI 界面
npm run test:coverage   # 覆盖率报告
```

**编写第一个测试**：

```typescript
// src/services/__tests__/example.spec.ts
import { describe, it, expect } from 'vitest'

describe('示例测试', () => {
  it('应该正确相加', () => {
    expect(1 + 1).toBe(2)
  })
})
```

### 2. AI 服务测试（pytest）

```bash
# 安装依赖（已完成）
cd ai-service
pip install pytest pytest-asyncio httpx

# 运行测试
python -m pytest                    # 运行所有测试
python -m pytest tests/test_health.py -v  # 运行单个文件
python -m pytest -k "test_generate"       # 运行特定测试
python -m pytest --cov=app               # 覆盖率
```

**编写第一个测试**：

```python
# tests/test_example.py
import pytest

@pytest.mark.asyncio
async def test_example(client):
    """测试示例接口"""
    resp = await client.get("/ai/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
```

### 3. 后端测试（Jest）

```bash
cd backend
npm test              # 运行所有测试
npm run test:watch    # 监听模式
npm run test:cov      # 覆盖率
```

---

## 📝 TDD 实战示例

### 示例 1：添加新的 API 端点（AI 服务）

**需求**：添加一个 `/ai/storyboard/generate-script` 接口生成剧本

#### 步骤 1：🔴 写失败的测试

```python
# tests/test_storyboard.py
@pytest.mark.asyncio
async def test_generate_script_success(client):
    """测试剧本生成成功"""
    resp = await client.post("/ai/storyboard/generate-script", json={
        "synopsis": "一个关于勇气的故事",
        "storyType": "fantasy",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "script" in data
    assert len(data["script"]) > 100  # 至少100字
```

运行测试：
```bash
pytest tests/test_storyboard.py::test_generate_script_success -v
# ❌ FAILED - 404 Not Found（接口不存在）
```

#### 步骤 2：🟢 实现最少代码让测试通过

```python
# app/api/storyboard.py
@router.post("/generate-script")
async def generate_script(request: GenerateScriptRequest):
    adapter = get_ai_adapter()
    script = await adapter.generate_text(
        prompt=f"请为以下梗概创作剧本：\n{request.synopsis}",
        system_prompt="你是专业编剧..."
    )
    return {"script": script}
```

运行测试：
```bash
pytest tests/test_storyboard.py::test_generate_script_success -v
# ✅ PASSED
```

#### 步骤 3：🔵 重构优化

```python
# 添加数据验证、错误处理、文档
@router.post("/generate-script", response_model=GenerateScriptResponse)
async def generate_script(request: GenerateScriptRequest):
    """
    根据故事梗概生成完整剧本
    
    - **synopsis**: 故事梗概
    - **storyType**: 故事类型
    """
    # ... 优化的实现
```

再次运行测试确保通过：
```bash
pytest tests/test_storyboard.py -v
# ✅ 所有测试通过
```

---

### 示例 2：添加前端组件功能

**需求**：实现剧本生成按钮点击后保存到 localStorage

#### 步骤 1：🔴 写失败的测试

```typescript
// src/__tests__/workflow.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('剧本保存功能', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('应该将生成的剧本保存到 localStorage', () => {
    const testScript = '【第一幕】故事开始...'
    
    // 模拟保存操作
    saveScriptToLocalStorage(testScript)  // ❌ 函数不存在
    
    const saved = localStorage.getItem('currentScript')
    expect(saved).toBe(testScript)
  })
})
```

运行测试：
```bash
npm test
# ❌ FAILED - saveScriptToLocalStorage is not defined
```

#### 步骤 2：🟢 实现功能

```typescript
// src/utils/storage.ts
export function saveScriptToLocalStorage(script: string) {
  localStorage.setItem('currentScript', script)
}

export function getScriptFromLocalStorage(): string | null {
  return localStorage.getItem('currentScript')
}
```

更新测试导入：
```typescript
import { saveScriptToLocalStorage } from '@/utils/storage'
```

运行测试：
```bash
npm test
# ✅ PASSED
```

#### 步骤 3：🔵 重构

```typescript
// 添加类型安全和错误处理
export function saveScriptToLocalStorage(script: string): boolean {
  try {
    if (!script || script.trim().length === 0) {
      console.warn('尝试保存空剧本')
      return false
    }
    localStorage.setItem('currentScript', script)
    return true
  } catch (error) {
    console.error('保存剧本失败:', error)
    return false
  }
}
```

再次测试：
```bash
npm test
# ✅ 所有测试通过
```

---

## 🎓 TDD 最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的命名 - 清晰表达意图
it('应该在用户点击生成按钮后调用 API')
it('应该在 API 失败时显示错误消息')
it('应该将生成的剧本保存到 localStorage')

// ❌ 不好的命名 - 模糊不清
it('测试按钮')
it('测试1')
it('works')
```

### 2. 测试结构：AAA 模式

```typescript
it('应该正确格式化时间', () => {
  // Arrange（准备）- 设置测试数据
  const seconds = 125
  
  // Act（执行）- 调用被测试的函数
  const result = formatTime(seconds)
  
  // Assert（断言）- 验证结果
  expect(result).toBe('2:05')
})
```

### 3. 测试独立性

```typescript
// ✅ 好的 - 每个测试独立
describe('用户服务', () => {
  beforeEach(() => {
    // 每个测试前重置状态
    database.clear()
  })
  
  it('测试1', () => { /* ... */ })
  it('测试2', () => { /* ... */ })
})

// ❌ 不好的 - 测试相互依赖
it('创建用户', () => { user = createUser() })
it('更新用户', () => { updateUser(user) })  // 依赖上一个测试
```

### 4. 只测试公共接口

```typescript
// ✅ 好的 - 测试公共方法
it('应该生成剧本', async () => {
  const result = await aiService.generateScript('梗概')
  expect(result).toBeDefined()
})

// ❌ 不好的 - 测试内部实现细节
it('应该调用 _internalHelper 方法', () => {
  // 测试私有方法...
})
```

### 5. 使用 Mock 隔离依赖

```typescript
import { vi } from 'vitest'

it('应该调用 API', async () => {
  // Mock HTTP 请求
  const mockPost = vi.fn().mockResolvedValue({ script: '测试剧本' })
  vi.spyOn(aiClient, 'post').mockImplementation(mockPost)
  
  await aiService.generateScript('梗概')
  
  expect(mockPost).toHaveBeenCalledWith('/storyboard/generate-script', {
    synopsis: '梗概',
    storyType: 'fantasy'
  })
})
```

---

## 🔄 TDD 工作流集成

### 开发新功能的完整流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 写测试（RED）
# 编辑 tests/test_new_feature.py
npm test  # 或 pytest -v
# ❌ 测试失败

# 3. 实现功能（GREEN）
# 编辑 app/api/new_feature.py
npm test  # 或 pytest -v
# ✅ 测试通过

# 4. 重构（REFACTOR）
# 优化代码
npm test  # 确保仍然通过

# 5. 提交代码
git add .
git commit -m "feat: add new feature with tests"
git push
```

### Git Hook 自动测试

```bash
# .git/hooks/pre-commit
#!/bin/sh
# 提交前自动运行测试

echo "运行测试..."

# 前端测试
cd frontend && npm test || exit 1

# AI 服务测试
cd ../ai-service && pytest || exit 1

echo "✅ 所有测试通过"
```

---

## 📊 测试覆盖率目标

| 模块 | 目标覆盖率 | 当前状态 |
|------|-----------|---------|
| 前端服务层 | 80%+ | 🟡 60% |
| 前端组件 | 70%+ | 🔴 20% |
| AI API | 90%+ | 🟢 85% |
| 后端服务 | 85%+ | 🟢 90% |

查看覆盖率：
```bash
# 前端
npm run test:coverage

# AI 服务
pytest --cov=app --cov-report=html

# 后端
npm run test:cov
```

---

## 🛠️ 常用测试命令

### 前端（Vitest）
```bash
npm test                    # 运行所有测试
npm run test:watch          # 监听模式
npm run test:ui             # 打开 UI 界面
npm test -- services        # 只测试 services 目录
npm test -- --reporter=verbose  # 详细输出
```

### AI 服务（pytest）
```bash
pytest                      # 运行所有测试
pytest -v                   # 详细输出
pytest -k "test_generate"   # 运行匹配的测试
pytest --lf                 # 只运行上次失败的测试
pytest --maxfail=1          # 第一个失败后停止
pytest --pdb                # 失败时进入调试器
```

### 后端（Jest）
```bash
npm test                    # 运行所有测试
npm test -- --watch         # 监听模式
npm test -- project.service # 运行特定测试
npm test -- --coverage      # 生成覆盖率
```

---

## 📚 延伸阅读

- [Vitest 官方文档](https://vitest.dev/)
- [pytest 官方文档](https://docs.pytest.org/)
- [Jest 官方文档](https://jestjs.io/)
- [Test-Driven Development by Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530) - Kent Beck

---

## ✅ 检查清单

在提交代码前，确保：

- [ ] 所有测试通过 (`✅ PASSED`)
- [ ] 新功能有对应测试
- [ ] 测试覆盖率未下降
- [ ] 测试命名清晰易懂
- [ ] 无测试代码重复
- [ ] Mock 使用恰当
- [ ] 测试运行快速（< 5秒）

---

**记住**：测试不是负担，是保护伞！🛡️

遵循 TDD，让代码更可靠、重构更安全、开发更自信！
