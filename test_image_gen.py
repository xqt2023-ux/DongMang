"""
测试图片生成功能
"""
import requests
import json

# 测试场景描述（使用您的实际例子）
test_scene = """特写镜头。孙悟空猛地跃起，手中金箍棒化作一道金光残影穿下。贾宝玉面色淡然，胸前的通灵宝玉爆发出柔和的古铜色光芒，无数半透明的金色诗词文字环绕周身形成防御盾。构图充满动态张力，文字特效具有强烈的漫画感。"""

print("=" * 80)
print("测试图片生成 API")
print("=" * 80)
print(f"\n原始中文描述:\n{test_scene}\n")

# 调用 API
url = "http://localhost:8000/ai/image/generate"
payload = {
    "description": test_scene,
    "style": "japanese",
    "resolution": {
        "width": 1024,
        "height": 1792
    }
}

print("发送请求到 AI 服务...")
print(f"URL: {url}")
print(f"Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}\n")

try:
    response = requests.post(url, json=payload, timeout=120)
    response.raise_for_status()
    
    result = response.json()
    print("=" * 80)
    print("✅ 生成成功!")
    print("=" * 80)
    print(f"图片URL: {result.get('imageUrl')}")
    print(f"缩略图URL: {result.get('thumbnailUrl')}")
    print("\n请查看 AI 服务终端的详细日志了解翻译和生成过程")
    
except requests.exceptions.Timeout:
    print("❌ 请求超时（120秒）")
    print("提示: 图片生成可能需要较长时间，请检查 AI 服务日志")
except requests.exceptions.RequestException as e:
    print(f"❌ 请求失败: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"响应内容: {e.response.text}")
except Exception as e:
    print(f"❌ 发生错误: {e}")

print("\n" + "=" * 80)
