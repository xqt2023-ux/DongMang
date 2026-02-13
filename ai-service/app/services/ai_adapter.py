"""
AI 适配器 - 可插拔 AI 服务抽象层
通过适配器模式支持不同的AI服务提供商
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import os
import json
import asyncio
from app.models.schemas import AnimeStyle


class AIAdapter(ABC):
    """AI服务适配器基类"""

    @abstractmethod
    async def generate_text(self, prompt: str, system_prompt: str = "") -> str:
        """生成文本（用于分镜脚本生成）"""
        ...

    @abstractmethod
    async def generate_image(self, prompt: str, size: str = "1024x1792") -> str:
        """生成图片，返回图片URL"""
        ...

    async def generate_video(
        self, 
        prompt: str, 
        image_url: Optional[str] = None,
        duration: int = 5,
        resolution: str = "720P",
        aspect_ratio: str = "9:16"
    ) -> Dict[str, Any]:
        """
        生成视频（图生视频或文生视频）
        返回格式: {"task_id": "xxx", "status": "queued"}
        子类可选实现，不实现则抛出 NotImplementedError
        """
        raise NotImplementedError("Video generation not supported by this adapter")

    async def get_video_status(self, task_id: str) -> Dict[str, Any]:
        """
        查询视频生成状态
        返回格式: {"task_id": "xxx", "status": "completed/processing/failed", "video_url": "..."}
        子类可选实现，不实现则抛出 NotImplementedError
        """
        raise NotImplementedError("Video status query not supported by this adapter")


class OpenAIAdapter(AIAdapter):
    """OpenAI 适配器"""

    def __init__(self):
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(
                api_key=os.getenv("OPENAI_API_KEY", ""),
                base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            )
            self.model = os.getenv("OPENAI_MODEL", "gpt-4")
            self.image_model = os.getenv("OPENAI_IMAGE_MODEL", "dall-e-3")
        except ImportError:
            raise RuntimeError("openai package is required for OpenAI adapter")

    async def generate_text(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.8,
            max_tokens=2000,
        )
        return response.choices[0].message.content or ""

    async def generate_image(self, prompt: str, size: str = "1024x1792") -> str:
        response = await self.client.images.generate(
            model=self.image_model,
            prompt=prompt,
            size=size,
            quality="standard",
            n=1,
        )
        return response.data[0].url or ""


class MockAdapter(AIAdapter):
    """Mock 适配器（开发/测试用）"""

    async def generate_text(self, prompt: str, system_prompt: str = "") -> str:
        """返回Mock分镜脚本JSON"""
        return json.dumps({
            "title": "AI生成的故事",
            "scenes": [
                {
                    "order": i + 1,
                    "description": f"第{i+1}个场景：{prompt[:30]}的精彩画面",
                    "suggestedDuration": 3.0,
                    "suggestedTransition": ["fade", "slide-left", "zoom-in", "fade", "fade"][i],
                    "suggestedCameraMovement": {"type": "static", "speed": 0.5},
                    "characters": ["主角"],
                    "dialogue": {
                        "type": "narration" if i % 2 == 0 else "dialogue",
                        "speaker": None if i % 2 == 0 else "主角",
                        "text": f"这是第{i+1}个镜头的台词"
                    } if i < 4 else None
                }
                for i in range(5)
            ]
        }, ensure_ascii=False)

    async def generate_image(self, prompt: str, size: str = "1024x1792") -> str:
        """返回占位图URL"""
        colors = ["6c5ce7", "fd79a8", "00cec9", "ffeaa7", "00b894"]
        import random
        color = random.choice(colors)
        return f"https://placehold.co/{size.replace('x', 'x')}/{color}/ffffff?text=AI+Scene"


class BabelarkAdapter(AIAdapter):
    """Babelark AI 聚合平台适配器"""

    def __init__(self):
        import httpx
        self.api_key = os.getenv("BABELARK_API_KEY", "")
        self.base_url = os.getenv("BABELARK_BASE_URL", "https://api.babelark.com")
        
        # 模型配置
        self.text_model = os.getenv("BABELARK_TEXT_MODEL", "gemini-3-flash-preview")
        self.image_model = os.getenv("BABELARK_IMAGE_MODEL", "gemini-3-pro-image-preview")
        self.video_model = os.getenv("BABELARK_VIDEO_MODEL", "doubao-seedance-1-5-pro")
        self.video_model_ali = os.getenv("BABELARK_VIDEO_MODEL_ALI", "wan2.6-i2v")
        
        # HTTP 客户端
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
        )

    async def generate_text(self, prompt: str, system_prompt: str = "") -> str:
        """使用 Babelark Chat Completions API 生成文本"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.post(
            f"{self.base_url}/v1/chat/completions",
            json={
                "model": self.text_model,
                "messages": messages,
                "temperature": 0.8,
                "max_tokens": 2000,
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def generate_image(self, prompt: str, size: str = "1024x1792") -> str:
        """使用 Babelark Image Generation API 生成图片"""
        response = await self.client.post(
            f"{self.base_url}/v1/images/generations",
            json={
                "model": self.image_model,
                "prompt": prompt,
                "size": size,
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["data"][0]["url"]

    async def generate_video(
        self, 
        prompt: str, 
        image_url: Optional[str] = None,
        duration: int = 5,
        resolution: str = "720P",
        aspect_ratio: str = "9:16"
    ) -> Dict[str, Any]:
        """
        使用 Babelark Video Generation API 生成视频
        支持图生视频和文生视频
        """
        # 使用 OpenAI 兼容的 doubao-seedance-1-5-pro
        payload = {
            "model": self.video_model,
            "prompt": prompt,
            "duration": duration,
            "metadata": {
                "resolution": resolution,
                "aspect_ratio": aspect_ratio,
                "camera_fixed": True,
                "generate_audio": False  # 不生成音频，降低成本
            }
        }
        
        # 如果提供了图片，则为图生视频模式
        if image_url:
            payload["input_reference"] = image_url

        response = await self.client.post(
            f"{self.base_url}/v1/videos",
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "task_id": data["id"],
            "status": data["status"],  # queued / processing / completed / failed
            "created_at": data.get("created_at")
        }

    async def get_video_status(self, task_id: str) -> Dict[str, Any]:
        """查询视频生成任务状态"""
        response = await self.client.get(
            f"{self.base_url}/v1/videos/{task_id}"
        )
        response.raise_for_status()
        data = response.json()
        
        result = {
            "task_id": data["id"],
            "status": data["status"],
            "progress": data.get("progress", 0),
        }
        
        # 如果已完成，返回视频URL
        if data["status"] == "completed" and "metadata" in data:
            result["video_url"] = data["metadata"].get("url")
        
        return result

    async def generate_video_ali(
        self, 
        prompt: str, 
        image_url: Optional[str] = None,
        duration: int = 5,
        resolution: str = "720P"
    ) -> Dict[str, Any]:
        """
        使用阿里云 DashScope API (wan2.6-i2v) 生成视频
        备用方案，API 格式不同
        """
        # 阿里云 API 需要特殊的头部
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable"
        }
        
        payload = {
            "model": self.video_model_ali,
            "input": {
                "prompt": prompt,
            },
            "parameters": {
                "resolution": resolution,
            }
        }
        
        # 图生视频模式
        if image_url:
            payload["input"]["img_url"] = image_url

        response = await self.client.post(
            f"{self.base_url}/aliyun/api/v1/services/aigc/video-generation/video-synthesis",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "task_id": data["output"]["task_id"],
            "status": data["output"]["task_status"],  # PROCESSING / SUCCEEDED / FAILED
        }

    async def get_video_status_ali(self, task_id: str) -> Dict[str, Any]:
        """查询阿里云 DashScope 视频任务状态"""
        response = await self.client.get(
            f"{self.base_url}/aliyun/api/v1/tasks/{task_id}"
        )
        response.raise_for_status()
        data = response.json()
        
        output = data.get("output", {})
        result = {
            "task_id": output.get("task_id"),
            "status": output.get("task_status"),  # PROCESSING / SUCCEEDED / FAILED
        }
        
        # 转换为统一格式
        status_map = {
            "PROCESSING": "processing",
            "SUCCEEDED": "completed",
            "FAILED": "failed"
        }
        result["status"] = status_map.get(result["status"], result["status"])
        
        # 如果成功，获取视频URL
        if output.get("task_status") == "SUCCEEDED" and "results" in output:
            result["video_url"] = output["results"].get("video_url")
        
        return result

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()


def get_ai_adapter() -> AIAdapter:
    """
    工厂函数：根据环境配置返回对应的AI适配器
    可插拔设计，后续扩展只需添加新的 Adapter 类
    """
    provider = os.getenv("AI_PROVIDER", "mock").lower()
    print(f"🔧 AI_PROVIDER = {provider}")

    if provider == "openai":
        print("✅ Using OpenAIAdapter")
        return OpenAIAdapter()
    elif provider == "babelark":
        print("✅ Using BabelarkAdapter")
        return BabelarkAdapter()
    elif provider == "mock":
        print("✅ Using MockAdapter")
        return MockAdapter()
    else:
        print(f"⚠️ 未知的AI提供商 '{provider}'，使用Mock适配器")
        return MockAdapter()


def get_style_prompt(style: AnimeStyle) -> str:
    """根据动漫风格生成提示词前缀"""
    style_prompts = {
        AnimeStyle.JAPANESE: "Japanese anime style, vibrant colors, detailed character design, manga-inspired, Studio Ghibli quality",
        AnimeStyle.CHINESE: "Chinese donghua style, traditional Chinese art elements, flowing compositions, wuxia/xianxia aesthetics",
        AnimeStyle.CHIBI: "Chibi anime style, cute proportions, big eyes, super deformed, kawaii, pastel colors",
        AnimeStyle.REALISTIC: "Semi-realistic anime style, detailed shading, photorealistic backgrounds, Makoto Shinkai style",
        AnimeStyle.WATERCOLOR: "Watercolor anime style, soft edges, translucent colors, artistic brush strokes, ethereal atmosphere",
        AnimeStyle.PIXEL: "Pixel art anime style, 16-bit retro, detailed sprite work, nostalgic game aesthetic",
    }
    return style_prompts.get(style, style_prompts[AnimeStyle.JAPANESE])
