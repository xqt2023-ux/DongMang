"""
测试提示词优化功能
"""
import requests
import json

print("=" * 80)
print("测试提示词优化功能")
print("=" * 80)

# 测试1: 基础生成（只有中文描述）
print("\n【测试1】基础生成 - 只有中文描述")
print("-" * 80)
test1_scene = "特写镜头。孙悟空猛地跃起，手中金箍棒化作一道金光残影穿下。"
payload1 = {
    "description": test1_scene,
    "style": "japanese",
    "resolution": {"width": 1024, "height": 1792}
}

response1 = requests.post("http://localhost:8000/ai/image/generate", json=payload1, timeout=120)
if response1.status_code == 200:
    result1 = response1.json()
    print(f"✅ 生成成功")
    print(f"图片URL: {result1.get('imageUrl', 'N/A')[:80]}...")
    print(f"\n翻译后的提示词:\n{result1.get('translatedPrompt', 'N/A')}")
    print(f"\n完整提示词:\n{result1.get('promptUsed', 'N/A')[:200]}...")
    print(f"\n负面提示词:\n{result1.get('negativePromptUsed', 'N/A')}")
else:
    print(f"❌ 失败: {response1.status_code} - {response1.text}")

# 测试2: 使用自定义提示词
print("\n\n【测试2】自定义提示词 - 覆盖AI翻译")
print("-" * 80)
custom_prompt = "Sun Wukong leaping dramatically, golden staff glowing with magical energy, dynamic action pose, anime style"
payload2 = {
    "description": test1_scene,
    "style": "japanese",
    "resolution": {"width": 1024, "height": 1792},
    "customPrompt": custom_prompt
}

response2 = requests.post("http://localhost:8000/ai/image/generate", json=payload2, timeout=120)
if response2.status_code == 200:
    result2 = response2.json()
    print(f"✅ 生成成功")
    print(f"图片URL: {result2.get('imageUrl', 'N/A')[:80]}...")
    print(f"\n自定义提示词:\n{custom_prompt}")
    print(f"\n完整提示词:\n{result2.get('promptUsed', 'N/A')[:200]}...")
    print(f"(注意: 应该包含自定义提示词而不是翻译结果)")
else:
    print(f"❌ 失败: {response2.status_code} - {response2.text}")

# 测试3: 使用负面提示词
print("\n\n【测试3】负面提示词 - 避免不想要的元素")
print("-" * 80)
negative_prompt = "extra limbs, mutated hands, poorly drawn face, duplicate characters"
payload3 = {
    "description": test1_scene,
    "style": "japanese",
    "resolution": {"width": 1024, "height": 1792},
    "negativePrompt": negative_prompt
}

response3 = requests.post("http://localhost:8000/ai/image/generate", json=payload3, timeout=120)
if response3.status_code == 200:
    result3 = response3.json()
    print(f"✅ 生成成功")
    print(f"图片URL: {result3.get('imageUrl', 'N/A')[:80]}...")
    print(f"\n用户提供的负面提示词:\n{negative_prompt}")
    print(f"\n实际使用的负面提示词:\n{result3.get('negativePromptUsed', 'N/A')}")
    print(f"(注意: 应该包含默认负面提示词 + 用户提供的负面提示词)")
else:
    print(f"❌ 失败: {response3.status_code} - {response3.text}")

print("\n" + "=" * 80)
print("测试完成！")
print("=" * 80)
