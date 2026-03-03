"""配音生成 API（真实 TTS：edge-tts）"""
import base64
import io
import math
import os
import re
import struct
import tempfile
import wave
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import edge_tts
from gtts import gTTS

router = APIRouter()


class GenerateVoiceRequest(BaseModel):
    text: str
    voiceType: str = "narration-pro"
    sceneId: str


class GenerateVoiceResponse(BaseModel):
    audioUrl: str
    voiceSource: str


def _normalize_tts_text(text: str) -> str:
    raw = (text or "").replace("\r\n", "\n").strip()
    if not raw:
        return ""

    lines = [line.strip() for line in raw.split("\n") if line.strip()]
    merged = "，".join(lines)
    merged = re.sub(r"\s+", " ", merged).strip()

    has_speakable = bool(re.search(r"[\u4e00-\u9fffA-Za-z0-9]", merged))
    if not has_speakable:
        return ""
    return merged


def _edge_voice_name(voice_type: str) -> str:
    mapping = {
        "male-calm": "zh-CN-YunxiNeural",
        "male-passionate": "zh-CN-YunyangNeural",
        "female-gentle": "zh-CN-XiaoxiaoNeural",
        "female-lively": "zh-CN-XiaoyiNeural",
        "youth": "zh-CN-XiaochenNeural",
        "narration-pro": "zh-CN-YunjianNeural",
    }
    return mapping.get(voice_type, "zh-CN-YunjianNeural")


async def _synthesize_mp3_data_uri_edge(text: str, voice_name: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp:
        temp_path = temp.name

    try:
        communicator = edge_tts.Communicate(text=text, voice=voice_name)
        await communicator.save(temp_path)

        with open(temp_path, "rb") as audio_file:
            mp3_bytes = audio_file.read()

        encoded = base64.b64encode(mp3_bytes).decode("ascii")
        return f"data:audio/mpeg;base64,{encoded}"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _synthesize_mp3_data_uri_gtts(text: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp:
        temp_path = temp.name

    try:
        has_cjk = any("\u4e00" <= char <= "\u9fff" for char in text)
        lang = "zh-cn" if has_cjk else "en"
        tts = gTTS(text=text, lang=lang, slow=False)
        tts.save(temp_path)

        with open(temp_path, "rb") as audio_file:
            mp3_bytes = audio_file.read()

        encoded = base64.b64encode(mp3_bytes).decode("ascii")
        return f"data:audio/mpeg;base64,{encoded}"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _synthesize_wav_data_uri_local(text: str) -> str:
    sample_rate = 16000
    duration_seconds = max(1.2, min(4.0, len(text) / 24.0))
    total_frames = int(sample_rate * duration_seconds)
    base_freq = 220.0

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for frame in range(total_frames):
            t = frame / sample_rate
            envelope = 0.25 * math.sin(2 * math.pi * 2.0 * t)
            amplitude = int(1400 * (0.55 + envelope) * math.sin(2 * math.pi * base_freq * t))
            wav_file.writeframesraw(struct.pack("<h", amplitude))

    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:audio/wav;base64,{encoded}"


@router.post("/generate", response_model=GenerateVoiceResponse)
async def generate_voice(request: GenerateVoiceRequest):
    text = _normalize_tts_text(request.text or "")
    if not text:
        text = "你好，这是默认配音内容。"
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="文本过长，请控制在2000字以内")

    try:
        voice_name = _edge_voice_name(request.voiceType)
        try:
            audio_url = await _synthesize_mp3_data_uri_edge(text=text, voice_name=voice_name)
            voice_source = "edge-tts"
        except Exception as edge_error:
            print(f"⚠️ edge-tts 失败，降级 gTTS: {edge_error}")
            try:
                audio_url = _synthesize_mp3_data_uri_gtts(text=text)
                voice_source = "gtts"
            except Exception as gtts_error:
                print(f"⚠️ gTTS 失败，降级本地离线音频: {gtts_error}")
                audio_url = _synthesize_wav_data_uri_local(text=text)
                voice_source = "local-fallback"
        return GenerateVoiceResponse(audioUrl=audio_url, voiceSource=voice_source)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"配音生成失败: {str(exc)}")
