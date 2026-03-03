"""
图片生成 API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.schemas import GenerateImageRequest, GenerateImageResponse, AnimeStyle
from app.services.ai_adapter import get_ai_adapter, get_style_prompt

router = APIRouter()


class GenerateRoleImageRequest(BaseModel):
    """角色图片生成请求"""
    name: str
    description: str
    style: AnimeStyle = AnimeStyle.JAPANESE


@router.post("/generate-role", response_model=GenerateImageResponse)
async def generate_role_image(request: GenerateRoleImageRequest):
    """
    根据角色名称和描述生成角色形象图
    """
    adapter = get_ai_adapter()
    style_prompt = get_style_prompt(request.style)
    
    print(f"👤 角色图片生成请求:")
    print(f"  - 角色名: {request.name}")
    print(f"  - 描述: {request.description[:100]}...")
    print(f"  - 风格: {request.style}")

    # 翻译中文描述为英文
    try:
        translated_description = await adapter.translate_to_english(request.description)
        translated_name = await adapter.translate_to_english(request.name)
        print(f"  - 翻译后名称: {translated_name}")
        print(f"  - 翻译后描述: {translated_description[:100]}...")
    except Exception as e:
        print(f"⚠️ 翻译失败，使用原文: {e}")
        translated_description = request.description
        translated_name = request.name
    
    # 构建角色图片提示词
    full_prompt = f"""{style_prompt}.
Character: {translated_name}
Description: {translated_description}
Full body character design, anime character illustration, white background,
character reference sheet, high quality, detailed."""
    
    print(f"  - 完整提示词长度: {len(full_prompt)} 字符")
    
    try:
        print(f"🎨 调用 AI 生成角色图片...")
        image_url = await adapter.generate_image(prompt=full_prompt, size="1024x1024")
        print(f"✅ 角色图片生成成功: {image_url[:80]}...")
        return GenerateImageResponse(
            imageUrl=image_url,
            thumbnailUrl=image_url,
            promptUsed=full_prompt,
            translatedPrompt=translated_description,
            modelUsed=getattr(adapter, "last_image_model_used", None),
        )
    except Exception as e:
        print(f"❌ 角色图片生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"角色图片生成失败: {str(e)}")


@router.post("/generate", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest):
    """
    根据场景描述生成动漫风格图片
    """
    adapter = get_ai_adapter()
    style_prompt = get_style_prompt(request.style)

    print(f"📸 图片生成请求:")
    print(f"  - 原始描述: {request.description[:100]}...")
    print(f"  - 风格: {request.style}")
    print(f"  - 分辨率: {request.resolution.width}x{request.resolution.height}")
    print(f"  - 参考图数量: {len(request.reference_images)}")
    if request.custom_prompt:
        print(f"  - 自定义提示词: {request.custom_prompt[:100]}...")
    if request.negative_prompt:
        print(f"  - 负面提示词: {request.negative_prompt[:100]}...")

    # 如果用户提供了自定义提示词，直接使用
    if request.custom_prompt:
        translated_description = request.custom_prompt
        print(f"  - 使用自定义提示词")
    else:
        # 翻译中文描述为英文（提高生成质量）
        try:
            translated_description = await adapter.translate_to_english(request.description)
            print(f"  - 翻译后: {translated_description[:150]}...")
        except Exception as e:
            print(f"⚠️ 翻译失败，使用原文: {e}")
            translated_description = request.description

    # 构建优化的图片生成提示词（使用逗号分隔的标签格式）
    full_prompt = f"""{style_prompt}, {translated_description}, highly detailed, professional anime illustration, cinematic composition, dramatic lighting, rich colors, masterpiece quality, vertical format optimized for mobile"""

    print(f"  - 完整提示词: {full_prompt[:200]}...")
    print(f"  - 提示词总长度: {len(full_prompt)} 字符")

    # 默认负面提示词（提高质量，避免常见问题）
    default_negative = "blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, watermark, text, signature, duplicate, mutation, extra limbs"
    
    # 合并用户提供的负面提示词
    if request.negative_prompt:
        negative_prompt = f"{default_negative}, {request.negative_prompt}"
    else:
        negative_prompt = default_negative
    
    print(f"  - 负面提示词: {negative_prompt[:150]}...")

    # 根据分辨率确定尺寸
    w, h = request.resolution.width, request.resolution.height
    if w > h:
        size = "1792x1024"
    elif h > w:
        size = "1024x1792"
    else:
        size = "1024x1024"

    try:
        print(f"🎨 调用 AI 生成图片 (size={size})...")
        # 注意：flux-1-schnell 可能不支持负面提示词，这里先记录
        # 如果需要使用负面提示词，可能需要切换到支持的模型
        image_url = await adapter.generate_image(
            prompt=full_prompt,
            size=size,
            reference_images=request.reference_images,
        )
        print(f"✅ 图片生成成功: {image_url[:80]}...")
        return GenerateImageResponse(
            imageUrl=image_url,
            thumbnailUrl=image_url,
            promptUsed=full_prompt,
            translatedPrompt=translated_description,
            negativePromptUsed=negative_prompt,
            modelUsed=getattr(adapter, "last_image_model_used", None),
        )
    except Exception as e:
        print(f"❌ 图片生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"图片生成失败: {str(e)}")
