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
    
    # 构建角色图片提示词
    full_prompt = f"""{style_prompt}.
Character: {request.name}
Description: {request.description}
Full body character design, anime character illustration, white background,
character reference sheet, high quality, detailed."""
    
    try:
        image_url = await adapter.generate_image(prompt=full_prompt, size="1024x1024")
        return GenerateImageResponse(
            imageUrl=image_url,
            thumbnailUrl=image_url,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"角色图片生成失败: {str(e)}")


@router.post("/generate", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest):
    """
    根据场景描述生成动漫风格图片
    """
    adapter = get_ai_adapter()
    style_prompt = get_style_prompt(request.style)

    # 构建完整的图片生成提示词
    full_prompt = f"""{style_prompt}.
Scene: {request.description}
High quality, detailed anime illustration, cinematic composition, 
vertical format for mobile short video."""

    # 根据分辨率确定尺寸
    w, h = request.resolution.width, request.resolution.height
    if w > h:
        size = "1792x1024"
    elif h > w:
        size = "1024x1792"
    else:
        size = "1024x1024"

    try:
        image_url = await adapter.generate_image(prompt=full_prompt, size=size)
        return GenerateImageResponse(
            imageUrl=image_url,
            thumbnailUrl=image_url,  # MVP阶段缩略图与原图相同
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图片生成失败: {str(e)}")
