"""
Pydantic 数据模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class AnimeStyle(str, Enum):
    JAPANESE = "japanese"
    CHINESE = "chinese"
    CHIBI = "chibi"
    REALISTIC = "realistic"
    WATERCOLOR = "watercolor"
    PIXEL = "pixel"


class TransitionType(str, Enum):
    FADE = "fade"
    SLIDE_LEFT = "slide-left"
    SLIDE_RIGHT = "slide-right"
    ZOOM_IN = "zoom-in"
    ZOOM_OUT = "zoom-out"
    NONE = "none"


class CameraMovement(BaseModel):
    type: str = "static"
    speed: float = 0.5


class DialogueInfo(BaseModel):
    type: Literal["dialogue", "narration"]
    speaker: Optional[str] = None
    text: str


class StoryboardScene(BaseModel):
    order: int
    description: str
    suggested_duration: float = Field(alias="suggestedDuration", default=3.0)
    suggested_transition: TransitionType = Field(alias="suggestedTransition", default=TransitionType.FADE)
    suggested_camera_movement: CameraMovement = Field(alias="suggestedCameraMovement", default_factory=CameraMovement)
    characters: list[str] = []
    dialogue: Optional[DialogueInfo] = None

    class Config:
        populate_by_name = True


class StoryboardScript(BaseModel):
    title: str
    style: AnimeStyle
    scenes: list[StoryboardScene]


class Resolution(BaseModel):
    width: int = 1080
    height: int = 1920


# ==================== 请求模型 ====================

class GenerateScriptRequest(BaseModel):
    """剧本生成请求"""
    synopsis: str
    story_type: str = Field(alias="storyType", default="fantasy")

    class Config:
        populate_by_name = True


class GenerateScriptResponse(BaseModel):
    """剧本生成响应"""
    script: str


class GenerateStoryboardRequest(BaseModel):
    prompt: str
    style: AnimeStyle = AnimeStyle.JAPANESE
    scene_count: int = Field(alias="sceneCount", default=5)

    class Config:
        populate_by_name = True


class GenerateImageRequest(BaseModel):
    description: str
    style: AnimeStyle = AnimeStyle.JAPANESE
    resolution: Resolution = Resolution()
    reference_images: list[str] = Field(alias="referenceImages", default=[])

    class Config:
        populate_by_name = True


class RegenerateSceneRequest(BaseModel):
    original_description: str = Field(alias="originalDescription")
    feedback: str
    style: AnimeStyle = AnimeStyle.JAPANESE

    class Config:
        populate_by_name = True


class GenerateVideoRequest(BaseModel):
    """视频生成请求"""
    prompt: str
    image_url: Optional[str] = Field(alias="imageUrl", default=None)
    duration: int = Field(default=5, ge=1, le=10)  # 1-10秒
    resolution: str = Field(default="720P", pattern="^(480P|720P|1080P)$")
    aspect_ratio: str = Field(alias="aspectRatio", default="9:16", pattern="^(1:1|16:9|9:16|21:9|4:3|3:4)$")
    use_ali_model: bool = Field(alias="useAliModel", default=False)  # 是否使用阿里云模型

    class Config:
        populate_by_name = True


class VideoStatusRequest(BaseModel):
    """视频状态查询请求"""
    task_id: str = Field(alias="taskId")
    use_ali_model: bool = Field(alias="useAliModel", default=False)

    class Config:
        populate_by_name = True


# ==================== 响应模型 ====================

class GenerateImageResponse(BaseModel):
    image_url: str = Field(alias="imageUrl")
    thumbnail_url: str = Field(alias="thumbnailUrl")

    class Config:
        populate_by_name = True


class GenerateVideoResponse(BaseModel):
    """视频生成响应"""
    task_id: str = Field(alias="taskId")
    status: str  # queued / processing / completed / failed
    created_at: Optional[int] = Field(alias="createdAt", default=None)

    class Config:
        populate_by_name = True


class VideoStatusResponse(BaseModel):
    """视频状态响应"""
    task_id: str = Field(alias="taskId")
    status: str  # queued / processing / completed / failed
    progress: int = Field(default=0, ge=0, le=100)
    video_url: Optional[str] = Field(alias="videoUrl", default=None)

    class Config:
        populate_by_name = True


class RegenerateSceneResponse(BaseModel):
    description: str
