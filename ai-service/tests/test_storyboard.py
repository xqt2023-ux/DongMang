"""分镜脚本 API 测试"""
import pytest


@pytest.mark.asyncio
class TestGenerateStoryboard:
    """POST /storyboard/generate"""

    async def test_generate_storyboard_success(self, client):
        resp = await client.post("/storyboard/generate", json={
            "prompt": "一个少年在樱花树下练剑",
            "style": "japanese",
            "sceneCount": 5,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "title" in data
        assert "scenes" in data
        assert len(data["scenes"]) == 5

    async def test_generate_storyboard_default_scene_count(self, client):
        resp = await client.post("/storyboard/generate", json={
            "prompt": "森林中的冒险",
        })
        assert resp.status_code == 200
        data = resp.json()
        # default sceneCount = 5
        assert len(data["scenes"]) == 5

    async def test_generate_storyboard_scene_structure(self, client):
        resp = await client.post("/storyboard/generate", json={
            "prompt": "测试故事",
            "sceneCount": 3,
        })
        assert resp.status_code == 200
        scene = resp.json()["scenes"][0]
        assert "order" in scene
        assert "description" in scene
        assert scene["order"] == 1

    async def test_generate_storyboard_missing_prompt(self, client):
        resp = await client.post("/storyboard/generate", json={})
        assert resp.status_code == 422  # validation error

    async def test_generate_storyboard_all_styles(self, client):
        for style in ["japanese", "chinese", "chibi", "realistic", "watercolor", "pixel"]:
            resp = await client.post("/storyboard/generate", json={
                "prompt": "测试",
                "style": style,
                "sceneCount": 2,
            })
            assert resp.status_code == 200, f"style={style} failed"


@pytest.mark.asyncio
class TestRegenerateScene:
    """POST /storyboard/regenerate-scene"""

    async def test_regenerate_scene_success(self, client):
        resp = await client.post("/storyboard/regenerate-scene", json={
            "originalDescription": "一个少年在河边钓鱼",
            "feedback": "增加一些夕阳的元素",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "description" in data
        assert len(data["description"]) > 0

    async def test_regenerate_scene_missing_fields(self, client):
        resp = await client.post("/storyboard/regenerate-scene", json={})
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestGenerateScript:
    """POST /storyboard/generate-script — AI根据主题生成完整剧本"""

    async def test_generate_script_success(self, client):
        resp = await client.post("/storyboard/generate-script", json={
            "theme": "校园爱情",
            "storyType": "romance",
            "tone": "温暖",
            "duration": 60,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "script" in data
        assert len(data["script"]) > 0

    async def test_generate_script_minimal(self, client):
        resp = await client.post("/storyboard/generate-script", json={
            "theme": "冒险",
        })
        assert resp.status_code == 200
        assert "script" in resp.json()

    async def test_generate_script_missing_theme(self, client):
        resp = await client.post("/storyboard/generate-script", json={})
        assert resp.status_code == 422
