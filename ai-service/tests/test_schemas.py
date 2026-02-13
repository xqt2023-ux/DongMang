"""Pydantic 数据模型验证测试"""
import pytest
from pydantic import ValidationError
from app.models.schemas import (
    AnimeStyle,
    StoryboardScene,
    StoryboardScript,
    GenerateStoryboardRequest,
    GenerateImageRequest,
    RegenerateSceneRequest,
    Resolution,
    CameraMovement,
    GenerateScriptRequest,
    GenerateAvatarRequest,
    GenerateBackgroundRequest,
    GenerateVoiceRequest,
    GenerateSceneVideoRequest,
    SynthesizeVideoRequest,
    SynthesizeSceneInput,
)


class TestAnimeStyle:
    def test_all_styles(self):
        for s in ["japanese", "chinese", "chibi", "realistic", "watercolor", "pixel"]:
            assert AnimeStyle(s) is not None

    def test_invalid_style(self):
        with pytest.raises(ValueError):
            AnimeStyle("nonexistent")


class TestStoryboardScene:
    def test_basic_scene(self):
        scene = StoryboardScene(order=1, description="一个场景")
        assert scene.order == 1
        assert scene.suggested_duration == 3.0
        assert scene.suggested_transition.value == "fade"

    def test_scene_with_alias(self):
        scene = StoryboardScene(
            order=1,
            description="test",
            suggestedDuration=5.0,
            suggestedTransition="zoom-in",
        )
        assert scene.suggested_duration == 5.0


class TestGenerateStoryboardRequest:
    def test_valid_request(self):
        req = GenerateStoryboardRequest(prompt="测试", style="japanese", sceneCount=3)
        assert req.prompt == "测试"
        assert req.scene_count == 3

    def test_default_values(self):
        req = GenerateStoryboardRequest(prompt="test")
        assert req.style == AnimeStyle.JAPANESE
        assert req.scene_count == 5

    def test_missing_prompt(self):
        with pytest.raises(ValidationError):
            GenerateStoryboardRequest()


class TestGenerateScriptRequest:
    def test_valid_request(self):
        req = GenerateScriptRequest(theme="冒险故事")
        assert req.theme == "冒险故事"

    def test_optional_fields(self):
        req = GenerateScriptRequest(
            theme="test", storyType="romance", tone="温暖", duration=60,
        )
        assert req.duration == 60


class TestGenerateAvatarRequest:
    def test_valid_request(self):
        req = GenerateAvatarRequest(name="小明", description="一个少年")
        assert req.name == "小明"

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            GenerateAvatarRequest(description="test")


class TestGenerateVoiceRequest:
    def test_valid_request(self):
        req = GenerateVoiceRequest(text="你好世界")
        assert req.text == "你好世界"

    def test_empty_text_rejected(self):
        with pytest.raises(ValidationError):
            GenerateVoiceRequest(text="")


class TestGenerateSceneVideoRequest:
    def test_valid_request(self):
        req = GenerateSceneVideoRequest(imageUrl="https://example.com/img.png")
        assert req.image_url == "https://example.com/img.png"
        assert req.duration == 3.0  # default

    def test_missing_image(self):
        with pytest.raises(ValidationError):
            GenerateSceneVideoRequest()


class TestSynthesizeVideoRequest:
    def test_valid_request(self):
        req = SynthesizeVideoRequest(scenes=[
            SynthesizeSceneInput(videoUrl="https://example.com/v1.mp4", duration=3.0),
        ])
        assert len(req.scenes) == 1

    def test_empty_scenes_rejected(self):
        with pytest.raises(ValidationError):
            SynthesizeVideoRequest(scenes=[])
