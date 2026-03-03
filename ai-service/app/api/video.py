"""
视频生成 API 端点
支持文生视频和图生视频
"""
from fastapi import APIRouter, HTTPException
import asyncio
import tempfile
import uuid
from pathlib import Path
import shutil
import httpx
from app.models.schemas import (
    GenerateVideoRequest,
    GenerateVideoResponse,
    VideoStatusRequest,
    VideoStatusResponse,
    SynthesizeVideoRequest,
    SynthesizeVideoResponse,
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


@router.post("/synthesize", response_model=SynthesizeVideoResponse)
async def synthesize_video(request: SynthesizeVideoRequest):
    """将多个分镜视频按顺序拼接为一个成片视频。"""
    if not shutil.which("ffmpeg"):
        raise HTTPException(status_code=500, detail="服务端未安装 ffmpeg，无法合成视频（请安装 ffmpeg 并确保在 PATH 中可执行）")

    clips = sorted(request.scenes, key=lambda item: item.order)
    clip_urls = [item.video_url for item in clips if item.video_url]

    if not clip_urls:
        raise HTTPException(status_code=400, detail="没有可用于合成的视频片段")

    generated_root = Path(__file__).resolve().parents[2] / "generated"
    generated_root.mkdir(parents=True, exist_ok=True)
    output_name = f"final-{request.project_id or 'project'}-{uuid.uuid4().hex[:10]}.mp4"
    output_path = generated_root / output_name

    with tempfile.TemporaryDirectory(prefix="dongmang-synth-") as tmp_dir:
        tmp_path = Path(tmp_dir)
        local_clips: list[Path] = []
        skipped_clips: list[str] = []

        download_timeout = httpx.Timeout(connect=10.0, read=20.0, write=20.0, pool=10.0)
        semaphore = asyncio.Semaphore(4)

        async def fetch_clip(index: int, url: str, client: httpx.AsyncClient):
            clip_path = tmp_path / f"clip-{index:03d}.mp4"
            async with semaphore:
                try:
                    response = await client.get(url)
                    response.raise_for_status()
                    clip_path.write_bytes(response.content)
                    if clip_path.stat().st_size == 0:
                        return None, url
                    return clip_path, None
                except Exception:
                    return None, url

        async with httpx.AsyncClient(timeout=download_timeout) as client:
            tasks = [fetch_clip(index, url, client) for index, url in enumerate(clip_urls)]
            results = await asyncio.gather(*tasks)

        for clip_path, skipped_url in results:
            if clip_path:
                local_clips.append(clip_path)
            if skipped_url:
                skipped_clips.append(skipped_url)

        if not local_clips:
            raise HTTPException(status_code=400, detail="可用分镜视频为 0，无法合成（选中的分镜视频链接可能均已失效）")

        concat_list = tmp_path / "concat.txt"
        concat_lines = "\n".join([f"file '{str(path).replace('\\', '/')}'" for path in local_clips])
        concat_list.write_text(concat_lines, encoding="utf-8")

        cmd_transcode = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-vf", "fps=24,format=yuv420p",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-movflags", "+faststart",
            "-c:a", "aac", "-b:a", "128k",
            "-ar", "44100",
            str(output_path),
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd_transcode,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await process.communicate()

        if process.returncode != 0:
            err_msg = (stderr or b"").decode("utf-8", errors="ignore")[:800]
            raise HTTPException(status_code=500, detail=f"视频合成失败: {err_msg or 'ffmpeg 执行失败'}")

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise HTTPException(status_code=500, detail="视频合成失败: 未生成输出文件")

    warning = None
    if skipped_clips:
        warning = f"已跳过 {len(skipped_clips)} 段无效分镜视频"

    return SynthesizeVideoResponse(
        video_url=f"/ai/generated/{output_name}",
        skipped_clips=skipped_clips,
        warning=warning,
    )
