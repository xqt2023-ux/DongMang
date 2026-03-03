"""
动漫工坊 - AI 服务
基于 FastAPI 的可插拔 AI 服务层
"""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.storyboard import router as storyboard_router
from app.api.image import router as image_router
from app.api.video import router as video_router
from app.api.voice import router as voice_router
from app.api.health import router as health_router

# 加载 .env 文件
load_dotenv()
print(f"🔧 Loaded AI_PROVIDER from .env: {os.getenv('AI_PROVIDER')}")

app = FastAPI(
    title="动漫工坊 AI 服务",
    description="AI动漫短视频制作工具 - AI服务层",
    version="0.1.0",
    root_path="/ai",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(health_router, tags=["健康检查"])
app.include_router(storyboard_router, prefix="/storyboard", tags=["分镜脚本"])
app.include_router(image_router, prefix="/image", tags=["图片生成"])
app.include_router(video_router, prefix="/video", tags=["视频生成"])
app.include_router(voice_router, prefix="/voice", tags=["配音生成"])

generated_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated")
os.makedirs(generated_dir, exist_ok=True)
app.mount("/generated", StaticFiles(directory=generated_dir), name="generated")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
