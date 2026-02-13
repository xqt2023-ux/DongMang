"""健康检查接口测试"""
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """GET /health should return status ok"""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "dongmang-ai-service"
    assert "version" in data
