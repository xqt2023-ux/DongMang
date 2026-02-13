"""
分镜脚本生成 API
"""
import json
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    GenerateScriptRequest,
    GenerateScriptResponse,
    GenerateStoryboardRequest,
    StoryboardScript,
    StoryboardScene,
    RegenerateSceneRequest,
    RegenerateSceneResponse,
)
from app.services.ai_adapter import get_ai_adapter, get_style_prompt

router = APIRouter()


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
        return GenerateScriptResponse(script=script_text.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"剧本生成失败: {str(e)}")


@router.post("/generate", response_model=StoryboardScript)
async def generate_storyboard(request: GenerateStoryboardRequest):
    """
    根据用户的文字描述，AI生成分镜脚本
    """
    adapter = get_ai_adapter()
    style_desc = get_style_prompt(request.style)

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
            prompt=f"请为以下故事创建{request.scene_count}个分镜脚本：\n\n{request.prompt}",
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
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分镜脚本生成失败: {str(e)}")


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
