"""
视频生成 API 端点
支持文生视频和图生视频
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    GenerateVideoRequest,
    GenerateVideoResponse,
    VideoStatusRequest,
    VideoStatusResponse
)
from app.services.ai_adapter import get_ai_adapter

router = APIRouter()


@router.post("/generate", response_model=GenerateVideoResponse)
async def generate_video(request: GenerateVideoRequest):
    """
    生成视频（文生视频或图生视频）
    
    - 如果提供 image_url，则为图生视频模式
    - 如果不提供 image_url，则为文生视频模式
    - use_ali_model: True 使用阿里云 wan2.6-i2v，False 使用字节跳动 doubao-seedance-1-5-pro
    """
    try:
        adapter = get_ai_adapter()
        
        # 检查适配器是否支持视频生成
        if not hasattr(adapter, 'generate_video'):
            raise HTTPException(
                status_code=501,
                detail="当前AI适配器不支持视频生成功能"
            )
        
        # 根据选择使用不同的模型
        if request.use_ali_model:
            # 使用阿里云 DashScope API
            if not hasattr(adapter, 'generate_video_ali'):
                raise HTTPException(
                    status_code=501,
                    detail="当前AI适配器不支持阿里云视频生成"
                )
            result = await adapter.generate_video_ali(
                prompt=request.prompt,
                image_url=request.image_url,
                duration=request.duration,
                resolution=request.resolution
            )
        else:
            # 使用默认的 OpenAI 兼容 API (doubao-seedance-1-5-pro)
            result = await adapter.generate_video(
                prompt=request.prompt,
                image_url=request.image_url,
                duration=request.duration,
                resolution=request.resolution,
                aspect_ratio=request.aspect_ratio
            )
        
        return GenerateVideoResponse(
            task_id=result["task_id"],
            status=result["status"],
            created_at=result.get("created_at")
        )
        
    except NotImplementedError as e:
        raise HTTPException(
            status_code=501,
            detail=f"视频生成功能未实现: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"视频生成失败: {str(e)}"
        )


@router.post("/status", response_model=VideoStatusResponse)
async def get_video_status(request: VideoStatusRequest):
    """
    查询视频生成任务状态
    
    - 轮询接口，用于获取异步任务的进度和结果
    - 当 status 为 "completed" 时，video_url 字段包含生成的视频URL
    """
    try:
        adapter = get_ai_adapter()
        
        # 检查适配器是否支持状态查询
        if not hasattr(adapter, 'get_video_status'):
            raise HTTPException(
                status_code=501,
                detail="当前AI适配器不支持视频状态查询"
            )
        
        # 根据模型类型选择不同的查询方法
        if request.use_ali_model:
            if not hasattr(adapter, 'get_video_status_ali'):
                raise HTTPException(
                    status_code=501,
                    detail="当前AI适配器不支持阿里云视频状态查询"
                )
            result = await adapter.get_video_status_ali(request.task_id)
        else:
            result = await adapter.get_video_status(request.task_id)
        
        return VideoStatusResponse(
            task_id=result["task_id"],
            status=result["status"],
            progress=result.get("progress", 0),
            video_url=result.get("video_url")
        )
        
    except NotImplementedError as e:
        raise HTTPException(
            status_code=501,
            detail=f"视频状态查询功能未实现: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"查询视频状态失败: {str(e)}"
        )


@router.get("/health")
async def health():
    """视频服务健康检查"""
    return {"status": "ok", "service": "video-generation"}
