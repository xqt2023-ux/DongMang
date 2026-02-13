"""语音生成 (TTS) API 测试"""
import pytest


@pytest.mark.asyncio
class TestGenerateVoice:
    """POST /voice/generate — 文字转语音"""

    async def test_generate_voice_success(self, client):
        resp = await client.post("/voice/generate", json={
            "text": "你好，世界！这是一段测试语音。",
            "voiceId": "zh-female-01",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "audioUrl" in data
        assert "duration" in data
        assert data["duration"] > 0

    async def test_generate_voice_default_voice(self, client):
        resp = await client.post("/voice/generate", json={
            "text": "默认语音测试",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "audioUrl" in data

    async def test_generate_voice_empty_text(self, client):
        resp = await client.post("/voice/generate", json={
            "text": "",
        })
        assert resp.status_code == 422

    async def test_generate_voice_missing_text(self, client):
        resp = await client.post("/voice/generate", json={})
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestListVoices:
    """GET /voice/list — 获取可用语音列表"""

    async def test_list_voices(self, client):
        resp = await client.get("/voice/list")
        assert resp.status_code == 200
        data = resp.json()
        assert "voices" in data
        assert len(data["voices"]) > 0
        voice = data["voices"][0]
        assert "id" in voice
        assert "name" in voice
        assert "language" in voice
