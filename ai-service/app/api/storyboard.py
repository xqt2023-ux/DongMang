"""
分镜脚本生成 API
"""
import json
import re
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    GenerateScriptRequest,
    GenerateScriptResponse,
    GenerateStoryboardRequest,
    StoryboardScript,
    StoryboardScene,
    RegenerateSceneRequest,
    RegenerateSceneResponse,
    ExtractAssetsRequest,
    ExtractAssetsResponse,
    ExtractedAssetItem,
    AnimeStyle,
)
from app.services.ai_adapter import get_ai_adapter, get_style_prompt

router = APIRouter()


def _json_load_with_fallback(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        raise


def _map_items(raw_items: list) -> list[ExtractedAssetItem]:
    result: list[ExtractedAssetItem] = []
    for item in raw_items or []:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        confidence = item.get("confidence", 0.85)
        try:
            confidence = max(0.0, min(1.0, float(confidence)))
        except Exception:
            confidence = 0.85
        result.append(
            ExtractedAssetItem(
                name=name,
                description=(item.get("description") or "").strip(),
                confidence=confidence,
                evidence=(item.get("evidence") or "").strip() or None,
            )
        )
    return result


def _should_use_storyboard_fallback(error_text: str) -> bool:
    text = (error_text or "").lower()
    return (
        "no available channel" in text
        or "model_not_found" in text
        or "倍率或价格未配置" in text
        or "ratio or price not set" in text
        or (
            "/v1/chat/completions" in text
            and (
                "500 internal server error" in text
                or "503 service unavailable" in text
                or "502 bad gateway" in text
                or "504 gateway timeout" in text
            )
        )
    )


def _normalize_story_prompt(text: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return ""

    raw = raw.replace("\r\n", "\n")
    raw = re.sub(r"^```[a-zA-Z]*\n", "", raw)
    raw = re.sub(r"\n```$", "", raw)

    cleaned_lines: list[str] = []
    for line in raw.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        stripped = re.sub(r"^(gemini|assistant|ai)\s*(said|回复|回答)?\s*[:：]\s*", "", stripped, flags=re.IGNORECASE)
        cleaned_lines.append(stripped)

    return "\n".join(cleaned_lines).strip()


def _extract_story_beats(prompt: str) -> list[str]:
    normalized = _normalize_story_prompt(prompt)
    if not normalized:
        return []

    chunks = re.split(r"[\n。！？!?；;]+", normalized)
    beats: list[str] = []
    for chunk in chunks:
        item = chunk.strip(" ，,。；;：:")
        if len(item) < 8:
            continue
        if item in beats:
            continue
        beats.append(item)
    return beats


def _expand_story_beats(beats: list[str], normalized_prompt: str, target_count: int) -> list[str]:
    if target_count <= 0:
        return []

    if len(beats) >= target_count:
        return beats[:target_count]

    result = beats[:]
    if not result:
        fallback = normalized_prompt.strip()
        if fallback:
            result.append(fallback)

    phase_hints = ["开场", "铺垫", "冲突", "升级", "爆发", "收束", "转折", "余波"]
    safe_prompt = normalized_prompt.strip()

    while len(result) < target_count:
        index = len(result)
        hint = phase_hints[index % len(phase_hints)]

        if safe_prompt:
            span = 36
            start = (index * span) % max(len(safe_prompt), 1)
            snippet = safe_prompt[start:start + span].strip(" ，,。；;：:")
        else:
            snippet = "剧情推进"

        if len(snippet) < 8:
            seed = result[index % len(result)] if result else "剧情推进"
            snippet = seed[:36]

        result.append(f"{snippet}（{hint}）")

    return result[:target_count]


def _build_fallback_storyboard(prompt: str, style: AnimeStyle, scene_count: int) -> StoryboardScript:
    safe_count = max(1, min(scene_count or 5, 12))
    normalized_prompt = _normalize_story_prompt(prompt)
    beats = _expand_story_beats(_extract_story_beats(normalized_prompt), normalized_prompt, safe_count)
    scene_templates = [
        "远景建立镜头，交代主要环境与氛围，主体清晰，光影层次分明。",
        "中景推进，展示关键角色动作与冲突，构图稳定，叙事连续。",
        "特写强化情绪与细节，突出角色表情与关键道具信息。",
        "动态镜头表现局势变化，画面节奏提升，动作方向明确。",
        "收束镜头交代结果与悬念，视觉焦点集中，便于衔接下一场。",
    ]

    scenes: list[StoryboardScene] = []
    for index in range(safe_count):
        template = scene_templates[index % len(scene_templates)]
        beat = beats[index] if index < len(beats) else normalized_prompt[:80]
        if not beat:
            beat = "主角踏入关键场景并推动剧情发展"
        scenes.append(
            StoryboardScene(
                order=index + 1,
                description=f"第{index + 1}个分镜：{beat}。{template}",
                suggestedDuration=3.0,
                suggestedTransition="fade" if index == 0 else "slide-left",
                suggestedCameraMovement={"type": "static", "speed": 0.5},
                characters=[],
                dialogue=None,
            )
        )

    title = (normalized_prompt or "AI分镜").strip()[:20] or "AI分镜"
    return StoryboardScript(
        title=title,
        style=style,
        scenes=scenes,
        modelUsed="fallback-local-template",
        fallbackUsed=True,
    )


@router.post("/generate-script", response_model=GenerateScriptResponse)
async def generate_script(request: GenerateScriptRequest):
    """
    根据故事梗概生成完整剧本
    """
    adapter = get_ai_adapter()

    system_prompt = f"""你是一个专业的{request.story_type}类型故事编剧。
你需要根据用户提供的故事梗概，扩展成完整的剧本。

要求：
1. 采用经典的四幕剧结构：开端、发展、高潮、结局
2. 每一幕要有详细的场景描述和人物对话
3. 情节要连贯，节奏要紧凑
4. 人物性格要鲜明，对话要生动
5. 场景描述要具体，便于视觉化
6. 剧本格式清晰，使用【第X幕】标记
7. 总字数控制在800-1200字

请直接返回剧本内容，不要额外解释。"""

    try:
        script_text = await adapter.generate_text(
            prompt=f"请根据以下梗概创作完整剧本：\n\n{request.synopsis}",
            system_prompt=system_prompt,
        )
        return GenerateScriptResponse(
            script=script_text.strip(),
            modelUsed=getattr(adapter, "last_text_model_used", None) or getattr(adapter, "text_model", type(adapter).__name__),
            fallbackUsed=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"剧本生成失败: {str(e)}")


@router.post("/generate", response_model=StoryboardScript)
async def generate_storyboard(request: GenerateStoryboardRequest):
    """
    根据用户的文字描述，AI生成分镜脚本
    """
    adapter = get_ai_adapter()
    style_desc = get_style_prompt(request.style)
    normalized_prompt = _normalize_story_prompt(request.prompt)
    if not normalized_prompt:
        raise HTTPException(status_code=400, detail="剧本内容为空，无法生成分镜")

    system_prompt = f"""你是一个专业的动漫分镜脚本编写师。
你需要将用户的故事描述转换为{request.scene_count}个分镜场景。
动漫风格：{style_desc}

请以JSON格式返回，格式如下：
{{
  "title": "故事标题",
  "scenes": [
    {{
      "order": 1,
      "description": "详细的场景描述（包含画面元素、构图、光影等）",
      "suggestedDuration": 3.0,
      "suggestedTransition": "fade|slide-left|slide-right|zoom-in|zoom-out|none",
      "suggestedCameraMovement": {{ "type": "static|pan-left|pan-right|pan-up|pan-down|zoom-in|zoom-out", "speed": 0.5 }},
      "characters": ["角色名"],
      "dialogue": {{ "type": "dialogue|narration", "speaker": "角色名或null", "text": "台词内容" }}
    }}
  ]
}}

要求：
1. 每个场景描述要详细，便于AI绘图
2. 场景之间要有连贯的叙事逻辑
3. 合理安排转场效果和镜头运动
4. dialogue为null时表示该场景没有台词
5. 总时长大约15秒，每个场景约3秒
6. 只返回JSON，不要其他内容"""

    try:
        response_text = await adapter.generate_text(
            prompt=f"请为以下故事创建{request.scene_count}个分镜脚本：\n\n{normalized_prompt}",
            system_prompt=system_prompt,
        )

        # 解析JSON
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            # 尝试从文本中提取JSON
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start >= 0 and end > start:
                data = json.loads(response_text[start:end])
            else:
                raise ValueError("AI返回的内容不是有效的JSON")

        # 构建响应
        scenes = []
        for scene_data in data.get("scenes", []):
            scene = StoryboardScene(
                order=scene_data["order"],
                description=scene_data["description"],
                suggestedDuration=scene_data.get("suggestedDuration", 3.0),
                suggestedTransition=scene_data.get("suggestedTransition", "fade"),
                suggestedCameraMovement=scene_data.get("suggestedCameraMovement", {"type": "static", "speed": 0.5}),
                characters=scene_data.get("characters", []),
                dialogue=scene_data.get("dialogue"),
            )
            scenes.append(scene)

        return StoryboardScript(
            title=data.get("title", request.prompt[:20]),
            style=request.style,
            scenes=scenes,
            modelUsed=getattr(adapter, "last_text_model_used", None) or getattr(adapter, "text_model", type(adapter).__name__),
            fallbackUsed=False,
        )

    except Exception as e:
        error_text = str(e)
        if _should_use_storyboard_fallback(error_text):
            print("⚠️ 分镜脚本上游模型不可用，启用本地兜底分镜生成")
            return _build_fallback_storyboard(
                prompt=normalized_prompt,
                style=request.style,
                scene_count=request.scene_count,
            )

        raise HTTPException(status_code=500, detail=f"分镜脚本生成失败: {error_text}")


@router.post("/regenerate-scene", response_model=RegenerateSceneResponse)
async def regenerate_scene_description(request: RegenerateSceneRequest):
    """
    重新生成单个场景的描述
    """
    adapter = get_ai_adapter()

    prompt = f"""请修改以下动漫场景描述：

原始描述：{request.original_description}
用户反馈：{request.feedback}
动漫风格：{get_style_prompt(request.style)}

请返回修改后的场景描述（纯文本，不需要JSON格式）。描述要详细，包含画面元素、构图、光影等信息。"""

    try:
        new_description = await adapter.generate_text(prompt)
        return RegenerateSceneResponse(description=new_description.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"场景描述重新生成失败: {str(e)}")


@router.post("/extract-assets", response_model=ExtractAssetsResponse)
async def extract_assets(request: ExtractAssetsRequest):
    """
    从完整剧本中提取 场景/角色/道具（结构化输出）
    """
    script = (request.script or "").strip()
    if not script:
        raise HTTPException(status_code=400, detail="剧本为空，无法提取")

    adapter = get_ai_adapter()
    system_prompt = f"""你是动漫短剧制作的资产提取专家。
请从用户剧本中提取三类资产：场景、角色、道具。

本次配置的提取智能体：
- 场景提取智能体: {request.scene_agent}
- 角色提取智能体: {request.role_agent}
- 道具提取智能体: {request.prop_agent}

输出必须是严格 JSON，格式如下：
{{
  "scenes": [{{"name":"", "description":"", "confidence":0.9, "evidence":""}}],
  "roles": [{{"name":"", "description":"", "confidence":0.9, "evidence":""}}],
  "props": [{{"name":"", "description":"", "confidence":0.9, "evidence":""}}]
}}

规则：
1) name 必须简短可用；description 30~120字，偏视觉化描述。
2) confidence 范围 0~1。
3) 避免泛词（如“东西”“物品”），同义项优先归并。
4) 场景提取偏“地点/环境”，道具提取偏“可持有/可交互物体”。
5) 只返回 JSON，不要 markdown，不要解释文字。"""

    user_prompt = f"请从下列剧本中提取场景/角色/道具：\n\n{script}"

    try:
        raw = await adapter.generate_text(prompt=user_prompt, system_prompt=system_prompt)
        parsed = _json_load_with_fallback(raw)
        scenes = _map_items(parsed.get("scenes", []))
        roles = _map_items(parsed.get("roles", []))
        props = _map_items(parsed.get("props", []))
        return ExtractAssetsResponse(
            scenes=scenes,
            roles=roles,
            props=props,
            modelUsed=getattr(adapter, "last_text_model_used", None) or getattr(adapter, "text_model", type(adapter).__name__),
            fallbackUsed=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"资产提取失败: {str(e)}")
