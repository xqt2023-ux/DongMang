"""
AI 适配器 - 可插拔 AI 服务抽象层
通过适配器模式支持不同的AI服务提供商
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import os
import json
import asyncio
import math
from app.models.schemas import AnimeStyle


class AIAdapter(ABC):
    """AI服务适配器基类"""

    @abstractmethod
    async def generate_text(self, prompt: str, system_prompt: str = "") -> str:
        """生成文本（用于分镜脚本生成）"""
        ...

    @abstractmethod
    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1792",
        reference_images: Optional[list[str]] = None,
    ) -> str:
        """生成图片，返回图片URL"""
        ...

    async def translate_to_english(self, chinese_text: str) -> str:
        """
        将中文提示词翻译成英文（用于图片生成）
        子类可选实现，默认调用 generate_text
        """
        if not chinese_text or not any('\u4e00' <= char <= '\u9fff' for char in chinese_text):
            # 如果没有中文字符，直接返回
            return chinese_text
        
        system_prompt = """You are an expert at translating Chinese scene descriptions into detailed English prompts for AI image generation (Stable Diffusion, DALL-E, Midjourney style).

CRITICAL RULES:
1. Translate EVERY visual detail accurately
2. Use vivid, descriptive English with rich visual vocabulary
3. Break down complex scenes into clear visual elements
4. Keep artistic style terms in English (anime, cinematic, etc.)
5. Add specific visual details: lighting, colors, composition, atmosphere
6. Use comma-separated tags format for better AI understanding
7. Output ONLY the English prompt, no explanations or notes

EXAMPLE:
Chinese: "夕阳下的武士决斗场景"
English: "samurai duel at sunset, dramatic lighting, silhouettes against orange sky, dynamic action pose, traditional Japanese armor, katana swords clashing, dust particles in air, cinematic wide shot, warm color palette"
"""
        
        user_prompt = f"""Translate this Chinese scene description into a detailed English prompt for image generation. Add visual details about lighting, colors, composition, and atmosphere:

{chinese_text}

English prompt:"""
        
        try:
            translated = await self.generate_text(user_prompt, system_prompt)
            # 清理翻译结果，去除可能的引号和多余空白
            translated = translated.strip().strip('"\'')
            return translated
        except Exception as e:
            print(f"⚠️ Translation failed: {e}, using original text")
            return chinese_text

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
            self.last_text_model_used: Optional[str] = None
            self.last_image_model_used: Optional[str] = None
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
        self.last_text_model_used = self.model
        return response.choices[0].message.content or ""

    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1792",
        reference_images: Optional[list[str]] = None,
    ) -> str:
        self.last_image_model_used = self.image_model
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
        self.last_text_model_used = "mock-text"
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

    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1792",
        reference_images: Optional[list[str]] = None,
    ) -> str:
        """返回占位图URL"""
        self.last_image_model_used = "mock-image"
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
        self.last_text_model_used: Optional[str] = None
        self.fallback_text_models = [
            model.strip()
            for model in os.getenv(
                "BABELARK_FALLBACK_TEXT_MODELS",
                "gemini-2.5-flash",
            ).split(",")
            if model.strip() and model.strip() != self.text_model
        ]
        self.image_model = os.getenv("BABELARK_IMAGE_MODEL", "gemini-3-pro-image-preview")
        self.last_image_model_used: Optional[str] = None
        self.fallback_image_models = [
            model.strip()
            for model in os.getenv(
                "BABELARK_FALLBACK_IMAGE_MODELS",
                "doubao-seedream-4-5,gemini-2.5-flash-image",
            ).split(",")
            if model.strip()
        ]
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

        candidate_models = [self.text_model, *self.fallback_text_models]
        print(f"💬 Babelark 文本生成:")
        print(f"  - 提示词长度: {len(prompt)} 字符")
        print(f"  - 候选模型: {', '.join(candidate_models)}")

        last_error: Optional[Exception] = None
        for index, candidate_model in enumerate(candidate_models):
            try:
                print(f"  - 尝试模型: {candidate_model}")
                response = await self.client.post(
                    f"{self.base_url}/v1/chat/completions",
                    json={
                        "model": candidate_model,
                        "messages": messages,
                        "temperature": 0.8,
                        "max_tokens": 2000,
                    }
                )
                response.raise_for_status()
                data = response.json()
                result = data["choices"][0]["message"]["content"]
                self.last_text_model_used = candidate_model
                print(f"✅ Babelark 文本生成成功，模型: {candidate_model}，长度: {len(result)} 字符")
                return result
            except Exception as e:
                last_error = e
                print(f"⚠️ 文本模型失败: {candidate_model} -> {str(e)}")
                if hasattr(e, 'response') and hasattr(e.response, 'text'):
                    print(f"  - 响应内容: {e.response.text[:500]}")

                can_retry = self._is_text_model_unavailable_error(e)
                has_next = index < len(candidate_models) - 1
                if can_retry and has_next:
                    print("  - 命中模型不可用错误，切换到候补文本模型")
                    continue
                break

        raise last_error or RuntimeError("Babelark 文本生成失败")

    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1792",
        reference_images: Optional[list[str]] = None,
    ) -> str:
        """使用 Babelark Image Generation API 生成图片"""
        refs = [item for item in (reference_images or []) if item]
        normalized_size = self._normalize_image_size(size)
        print(f"🎨 Babelark 图片生成:")
        print(f"  - 模型: {self.image_model}")
        print(f"  - 尺寸: {normalized_size}")
        print(f"  - 参考图数量: {len(refs)}")
        print(f"  - 提示词: {prompt[:200]}...")

        payload = {
            "model": self.image_model,
            "prompt": prompt,
            "size": normalized_size,
        }
        if refs:
            payload["reference_images"] = refs

        try:
            response = await self.client.post(
                f"{self.base_url}/v1/images/generations",
                json=payload
            )
            response.raise_for_status()
            data = response.json()

            self.last_image_model_used = self.image_model
            image_url = self._extract_image_output(data)
            print(f"✅ Babelark 图片生成成功")
            print(f"  - URL: {image_url[:100]}...")
            return image_url
        except Exception as e:
            if self._is_model_unavailable_error(e):
                print("⚠️ 当前模型渠道不可用，尝试自动降级模型...")
                for fallback_model in self.fallback_image_models:
                    if fallback_model == self.image_model:
                        continue

                    fallback_payload = {
                        "model": fallback_model,
                        "prompt": prompt,
                        "size": self._normalize_image_size_for_model(normalized_size, fallback_model),
                    }
                    if refs:
                        fallback_payload["reference_images"] = refs

                    try:
                        print(f"  - 降级尝试模型: {fallback_model}")
                        fallback_response = await self.client.post(
                            f"{self.base_url}/v1/images/generations",
                            json=fallback_payload,
                        )
                        fallback_response.raise_for_status()
                        fallback_data = fallback_response.json()
                        self.last_image_model_used = fallback_model
                        fallback_image_url = self._extract_image_output(fallback_data)
                        print(f"✅ 图片生成成功（降级模型 {fallback_model}）")
                        print(f"  - URL: {fallback_image_url[:100]}...")
                        return fallback_image_url
                    except Exception as fallback_error:
                        print(f"⚠️ 降级模型失败: {fallback_model} -> {fallback_error}")

            if refs and hasattr(e, "response") and getattr(e.response, "status_code", None) in (400, 422):
                print("⚠️ 参考图参数可能不被当前模型支持，尝试降级为提示词参考后重试")
                retry_prompt = (
                    f"{prompt}\n"
                    f"Character consistency references: {', '.join(refs[:3])}. "
                    "Keep identity, costume and color scheme highly consistent with references."
                )
                retry_response = await self.client.post(
                    f"{self.base_url}/v1/images/generations",
                    json={
                        "model": self.image_model,
                        "prompt": retry_prompt,
                        "size": normalized_size,
                    }
                )
                retry_response.raise_for_status()
                retry_data = retry_response.json()
                retry_image_url = self._extract_image_output(retry_data)
                print("✅ 图片生成成功（降级重试）")
                print(f"  - URL: {retry_image_url[:100]}...")
                return retry_image_url

            print(f"❌ Babelark 图片生成失败: {str(e)}")
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                print(f"  - 响应内容: {e.response.text[:500]}")
            raise

    def _extract_image_output(self, data: Dict[str, Any]) -> str:
        """兼容 URL 与 base64 两种图片输出格式。"""
        items = data.get("data") or []
        if not items:
            raise ValueError("图片生成返回为空：缺少 data 字段")

        first = items[0] or {}

        image_url = first.get("url")
        if image_url:
            return image_url

        b64 = first.get("b64_json") or first.get("base64") or first.get("image_base64")
        if b64:
            mime_type = first.get("mime_type") or "image/png"
            return f"data:{mime_type};base64,{b64}"

        data_uri = first.get("image")
        if isinstance(data_uri, str) and data_uri.startswith("data:image"):
            return data_uri

        raise ValueError(f"无法解析图片输出，返回字段: {list(first.keys())}")

    def _normalize_image_size(self, size: str) -> str:
        """根据模型要求调整尺寸，避免因最小像素限制导致请求失败。"""
        return self._normalize_image_size_for_model(size, self.image_model)

    def _normalize_image_size_for_model(self, size: str, model_name: str) -> str:
        """根据指定模型要求调整尺寸。"""
        try:
            width_text, height_text = size.lower().split("x", 1)
            width = int(width_text)
            height = int(height_text)
        except Exception:
            return size

        # doubao-seedream-4-5 要求最小 3,686,400 像素
        if model_name.startswith("doubao-seedream-4-5"):
            min_pixels = 3686400
            area = width * height
            if area < min_pixels:
                scale = math.sqrt(min_pixels / area)
                width = max(64, int(round((width * scale) / 64.0) * 64))
                height = max(64, int(round((height * scale) / 64.0) * 64))

                while width * height < min_pixels:
                    if width <= height:
                        width += 64
                    else:
                        height += 64

                resized = f"{width}x{height}"
                print(f"⚙️ 图片尺寸已按模型约束放大: {size} -> {resized}")
                return resized

        return size

    def _is_model_unavailable_error(self, error: Exception) -> bool:
        """判断是否是模型渠道不可用错误。"""
        response = getattr(error, "response", None)
        status = getattr(response, "status_code", None)
        text = ""
        if response is not None:
            text = getattr(response, "text", "") or ""

        if status == 503 and ("model_not_found" in text or "no available channel" in text):
            return True
        return False

    def _is_text_model_unavailable_error(self, error: Exception) -> bool:
        """判断是否是文本模型不可用错误，可触发候补模型重试。"""
        response = getattr(error, "response", None)
        status = getattr(response, "status_code", None)
        text = ""
        if response is not None:
            text = ((getattr(response, "text", "") or "") + " " + str(getattr(error, "args", ""))).lower()

        return (
            "no available channel" in text
            or "model_not_found" in text
            or "倍率或价格未配置" in text
            or "ratio or price not set" in text
            or (status in (500, 502, 503, 504) and "/v1/chat/completions" in text)
        )

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
