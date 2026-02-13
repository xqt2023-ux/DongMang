"""
健康检查接口
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "dongmang-ai-service",
        "version": "0.1.0",
    }
