"""图片生成 API 测试"""
import pytest


@pytest.mark.asyncio
class TestGenerateImage:
    """POST /image/generate"""

    async def test_generate_image_success(self, client):
        resp = await client.post("/image/generate", json={
            "description": "阳光明媚的校园操场",
            "style": "japanese",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "imageUrl" in data
        assert "thumbnailUrl" in data
        assert data["imageUrl"].startswith("http")

    async def test_generate_image_custom_resolution(self, client):
        resp = await client.post("/image/generate", json={
            "description": "城市夜景",
            "style": "realistic",
            "resolution": {"width": 1920, "height": 1080},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "imageUrl" in data

    async def test_generate_image_missing_description(self, client):
        resp = await client.post("/image/generate", json={"style": "japanese"})
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestGenerateRoleAvatar:
    """POST /image/generate-avatar — 生成角色头像"""

    async def test_generate_avatar_success(self, client):
        resp = await client.post("/image/generate-avatar", json={
            "name": "小明",
            "description": "一个阳光开朗的少年，黑色短发，穿着校服",
            "style": "japanese",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "imageUrl" in data

    async def test_generate_avatar_minimal(self, client):
        resp = await client.post("/image/generate-avatar", json={
            "name": "角色A",
            "description": "神秘的魔法师",
        })
        assert resp.status_code == 200
        assert "imageUrl" in resp.json()

    async def test_generate_avatar_missing_name(self, client):
        resp = await client.post("/image/generate-avatar", json={
            "description": "一个角色",
        })
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestGenerateBackground:
    """POST /image/generate-background — 生成场景背景"""

    async def test_generate_background_success(self, client):
        resp = await client.post("/image/generate-background", json={
            "name": "教室",
            "description": "一间明亮的日式教室，窗外是樱花",
            "style": "japanese",
            "aspectRatio": "16:9",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "imageUrl" in data

    async def test_generate_background_default_ratio(self, client):
        resp = await client.post("/image/generate-background", json={
            "name": "森林",
            "description": "茂密的森林",
        })
        assert resp.status_code == 200
