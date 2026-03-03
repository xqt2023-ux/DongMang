# 测试模板文件库

本目录包含各种测试场景的模板代码，可以快速复制修改使用。

---

## 📁 前端测试模板（Vitest）

### 1. 服务层测试模板（Service Test Template）

**文件位置**: `frontend/src/services/__tests__/[service-name].spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { myService } from '../myService'
import { apiClient } from '../api'

// Mock 外部依赖
vi.mock('../api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

/**
 * 服务名称测试
 */
describe('MyService', () => {
  beforeEach(() => {
    // 每个测试前清除 mock
    vi.clearAllMocks()
  })

  describe('methodName', () => {
    it('应该能够 [期望行为]', async () => {
      // Arrange - 准备测试数据
      const mockData = { id: '1', name: '测试数据' }
      vi.mocked(apiClient.post).mockResolvedValue(mockData)

      // Act - 执行被测方法
      const result = await myService.methodName('param1', 'param2')

      // Assert - 验证结果
      expect(result).toBeDefined()
      expect(result).toEqual(mockData)
      expect(apiClient.post).toHaveBeenCalledWith('/api/endpoint', {
        param1: 'param1',
        param2: 'param2',
      })
    })

    it('应该能够处理错误情况', async () => {
      // Arrange
      const errorMessage = 'API Error'
      vi.mocked(apiClient.post).mockRejectedValue(new Error(errorMessage))

      // Act & Assert
      await expect(myService.methodName('', '')).rejects.toThrow(errorMessage)
    })
  })
})
```

---

### 2. Vue 组件测试模板（Component Test Template）

**文件位置**: `frontend/src/components/__tests__/[ComponentName].spec.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from '../MyComponent.vue'

/**
 * 组件名称测试
 */
describe('MyComponent', () => {
  it('应该正确渲染', () => {
    // Arrange
    const wrapper = mount(MyComponent, {
      props: {
        title: '测试标题',
        data: []
      }
    })

    // Assert
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('测试标题')
  })

  it('应该响应用户点击事件', async () => {
    // Arrange
    const wrapper = mount(MyComponent)
    const button = wrapper.find('button')

    // Act
    await button.trigger('click')

    // Assert
    expect(wrapper.emitted()).toHaveProperty('button-clicked')
  })

  it('应该根据 props 更新显示', async () => {
    // Arrange
    const wrapper = mount(MyComponent, {
      props: { count: 0 }
    })

    // Act
    await wrapper.setProps({ count: 5 })

    // Assert
    expect(wrapper.text()).toContain('5')
  })

  it('应该调用 emit 事件', async () => {
    // Arrange
    const onSubmitSpy = vi.fn()
    const wrapper = mount(MyComponent, {
      props: { onSubmit: onSubmitSpy }
    })

    // Act
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')

    // Assert
    expect(onSubmitSpy).toHaveBeenCalled()
  })
})
```

---

### 3. 集成测试模板（Integration Test Template）

**文件位置**: `frontend/src/__tests__/integration/[feature-name].spec.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

/**
 * 功能名称集成测试
 */
describe('Feature Integration Tests', () => {
  beforeEach(() => {
    // 每个测试前设置环境
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    // 每个测试后清理
  })

  it('应该完成完整的工作流', async () => {
    // Arrange - 准备初始状态
    const initialData = { user: 'test', token: 'abc123' }
    localStorage.setItem('auth', JSON.stringify(initialData))

    // Act - 执行多个步骤
    // 步骤 1: ...
    // 步骤 2: ...
    // 步骤 3: ...

    // Assert - 验证最终状态
    const finalData = localStorage.getItem('auth')
    expect(finalData).toBeDefined()
  })
})
```

---

## 📁 后端测试模板（pytest）

### 4. API 端点测试模板（API Endpoint Test Template）

**文件位置**: `ai-service/tests/test_[module_name].py`

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_api_endpoint_success(client: AsyncClient):
    """测试 API 端点成功响应"""
    # Arrange
    payload = {
        "param1": "value1",
        "param2": "value2",
    }

    # Act
    response = await client.post("/ai/endpoint", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "result" in data
    assert data["result"] is not None


@pytest.mark.asyncio
async def test_api_endpoint_missing_params(client: AsyncClient):
    """测试缺少必需参数时的错误处理"""
    # Arrange
    payload = {}  # 缺少必需参数

    # Act
    response = await client.post("/ai/endpoint", json=payload)

    # Assert
    assert response.status_code == 422  # Unprocessable Entity


@pytest.mark.asyncio
async def test_api_endpoint_invalid_data(client: AsyncClient):
    """测试无效数据的错误处理"""
    # Arrange
    payload = {
        "param1": "",  # 空值
        "param2": None,
    }

    # Act
    response = await client.post("/ai/endpoint", json=payload)

    # Assert
    assert response.status_code in [400, 422]
```

---

### 5. 服务层测试模板（Service Layer Test Template）

**文件位置**: `ai-service/tests/test_[service_name]_service.py`

```python
import pytest
from app.services.my_service import MyService
from app.adapters.ai_adapter import AIAdapter

@pytest.fixture
def my_service():
    """创建服务实例"""
    adapter = AIAdapter()
    return MyService(adapter)


@pytest.mark.asyncio
async def test_service_method_success(my_service):
    """测试服务方法成功执行"""
    # Arrange
    input_data = {"key": "value"}

    # Act
    result = await my_service.process(input_data)

    # Assert
    assert result is not None
    assert isinstance(result, dict)
    assert "output" in result


@pytest.mark.asyncio
async def test_service_method_with_mock(monkeypatch):
    """测试使用 Mock 的服务方法"""
    # Arrange
    async def mock_ai_call(*args, **kwargs):
        return {"mocked": "data"}

    service = MyService()
    monkeypatch.setattr(service.adapter, "generate", mock_ai_call)

    # Act
    result = await service.process({"input": "test"})

    # Assert
    assert result["mocked"] == "data"


@pytest.mark.unit
def test_service_utility_function():
    """测试工具函数"""
    # Arrange
    input_str = "test string"

    # Act
    result = MyService.format_string(input_str)

    # Assert
    assert result == "TEST STRING"
```

---

### 6. 数据库测试模板（Database Test Template）

**文件位置**: `backend/src/[module]/__tests__/[module].service.spec.ts` (NestJS)

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MyService } from '../my.service'
import { MyEntity } from '../entities/my.entity'

describe('MyService', () => {
  let service: MyService
  let repository: Repository<MyEntity>

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: getRepositoryToken(MyEntity),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<MyService>(MyService)
    repository = module.get<Repository<MyEntity>>(getRepositoryToken(MyEntity))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('应该被定义', () => {
    expect(service).toBeDefined()
  })

  describe('findAll', () => {
    it('应该返回所有实体数组', async () => {
      // Arrange
      const mockEntities = [
        { id: 1, name: 'Entity 1' },
        { id: 2, name: 'Entity 2' },
      ]
      mockRepository.find.mockResolvedValue(mockEntities)

      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual(mockEntities)
      expect(repository.find).toHaveBeenCalledTimes(1)
    })
  })

  describe('create', () => {
    it('应该创建新实体', async () => {
      // Arrange
      const newEntity = { name: 'New Entity' }
      const savedEntity = { id: 1, ...newEntity }
      mockRepository.create.mockReturnValue(savedEntity)
      mockRepository.save.mockResolvedValue(savedEntity)

      // Act
      const result = await service.create(newEntity)

      // Assert
      expect(result).toEqual(savedEntity)
      expect(repository.create).toHaveBeenCalledWith(newEntity)
      expect(repository.save).toHaveBeenCalledWith(savedEntity)
    })
  })
})
```

---

## 🔧 常用 Mock 模式

### Mock HTTP 请求

```typescript
// Vitest
vi.mock('@/services/api', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: 'mock' }),
  },
}))

// Jest
jest.mock('@/services/api', () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ data: 'mock' }),
  },
}))
```

### Mock localStorage

```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

global.localStorage = localStorageMock as any
```

### Mock Date

```typescript
const mockDate = new Date('2024-01-01')
vi.setSystemTime(mockDate)
```

### Mock 环境变量

```typescript
beforeEach(() => {
  process.env.API_URL = 'http://test-api.com'
})

afterEach(() => {
  delete process.env.API_URL
})
```

---

## ✅ 测试编写检查清单

使用测试模板时，确保：

- [ ] 测试文件命名遵循约定 (`*.spec.ts` 或 `test_*.py`)
- [ ] 每个测试都有清晰的描述
- [ ] 使用 AAA 模式（Arrange, Act, Assert）
- [ ] Mock 所有外部依赖
- [ ] 每个测试前清理状态（`beforeEach`）
- [ ] 测试独立运行，不依赖其他测试
- [ ] 覆盖正常情况和异常情况
- [ ] 断言具体明确，不模糊
- [ ] 测试运行快速（< 100ms per test）

---

## 📚 延伸阅读

- [Vitest 断言 API](https://vitest.dev/api/expect.html)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [pytest 完整文档](https://docs.pytest.org/)
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
