"""视频生成 API 测试"""
import pytest


@pytest.mark.asyncio
class TestGenerateSceneVideo:
    """POST /video/generate-scene — 单场景静态图转视频"""

    async def test_generate_scene_video_success(self, client):
        resp = await client.post("/video/generate-scene", json={
            "imageUrl": "https://example.com/scene1.png",
            "duration": 3.0,
            "cameraMovement": {"type": "pan-left", "speed": 0.5},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "taskId" in data
        assert "status" in data
        assert data["status"] in ("pending", "processing")

    async def test_generate_scene_video_minimal(self, client):
        resp = await client.post("/video/generate-scene", json={
            "imageUrl": "https://example.com/scene.png",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "taskId" in data

    async def test_generate_scene_video_missing_image(self, client):
        resp = await client.post("/video/generate-scene", json={
            "duration": 3.0,
        })
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestVideoStatus:
    """GET /video/status/{taskId} — 查询视频生成任务状态"""

    async def test_get_video_status_success(self, client):
        # 先提交一个任务
        create_resp = await client.post("/video/generate-scene", json={
            "imageUrl": "https://example.com/scene.png",
        })
        task_id = create_resp.json()["taskId"]

        resp = await client.get(f"/video/status/{task_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["taskId"] == task_id
        assert "status" in data
        assert data["status"] in ("pending", "processing", "completed", "failed")

    async def test_get_video_status_not_found(self, client):
        resp = await client.get("/video/status/nonexistent-task-id")
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestSynthesizeVideo:
    """POST /video/synthesize — 合成最终视频（拼接场景+音频+转场）"""

    async def test_synthesize_video_success(self, client):
        resp = await client.post("/video/synthesize", json={
            "scenes": [
                {
                    "videoUrl": "https://example.com/scene1.mp4",
                    "duration": 3.0,
                    "transition": "fade",
                    "audioUrl": "https://example.com/voice1.mp3",
                },
                {
                    "videoUrl": "https://example.com/scene2.mp4",
                    "duration": 3.0,
                    "transition": "slide-left",
                    "audioUrl": "",
                },
            ],
            "bgmUrl": "",
            "aspectRatio": "16:9",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "taskId" in data
        assert "status" in data

    async def test_synthesize_video_empty_scenes(self, client):
        resp = await client.post("/video/synthesize", json={
            "scenes": [],
        })
        assert resp.status_code == 422

    async def test_synthesize_video_missing_scenes(self, client):
        resp = await client.post("/video/synthesize", json={})
        assert resp.status_code == 422
