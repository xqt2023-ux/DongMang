"""测试新增的剧本生成和角色图片生成功能"""
import pytest


@pytest.mark.asyncio
class TestGenerateScript:
    """POST /storyboard/generate-script"""

    async def test_generate_script_success(self, client):
        """测试剧本生成成功"""
        resp = await client.post("/ai/storyboard/generate-script", json={
            "synopsis": "一个少年在末日废墟中驾驶机甲战斗",
            "storyType": "fantasy",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "script" in data
        assert len(data["script"]) > 0

    async def test_generate_script_empty_synopsis(self, client):
        """测试空梗概"""
        resp = await client.post("/ai/storyboard/generate-script", json={
            "synopsis": "",
            "storyType": "fantasy",
        })
        assert resp.status_code == 200  # Mock adapter always succeeds

    async def test_generate_script_different_types(self, client):
        """测试不同故事类型"""
        for story_type in ["fantasy", "scifi", "romance", "mystery"]:
            resp = await client.post("/ai/storyboard/generate-script", json={
                "synopsis": "测试故事",
                "storyType": story_type,
            })
            assert resp.status_code == 200


@pytest.mark.asyncio
class TestGenerateRoleImage:
    """POST /image/generate-role"""

    async def test_generate_role_image_success(self, client):
        """测试角色图片生成成功"""
        resp = await client.post("/ai/image/generate-role", json={
            "name": "孙悟空",
            "description": "身穿虎皮裙，手持金箍棒，火眼金睛",
            "style": "japanese",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "imageUrl" in data
        assert "thumbnailUrl" in data
        assert data["imageUrl"].startswith("http")

    async def test_generate_role_image_missing_name(self, client):
        """测试缺少角色名称"""
        resp = await client.post("/ai/image/generate-role", json={
            "description": "测试描述",
        })
        assert resp.status_code == 422  # Validation error

    async def test_generate_role_image_different_styles(self, client):
        """测试不同动漫风格"""
        for style in ["japanese", "chinese", "chibi", "realistic"]:
            resp = await client.post("/ai/image/generate-role", json={
                "name": "测试角色",
                "description": "测试描述",
                "style": style,
            })
            assert resp.status_code == 200
