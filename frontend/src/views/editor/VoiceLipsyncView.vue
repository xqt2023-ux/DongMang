<template>
  <div class="step-view voice-lipsync">
    <h1 class="step-title">配音对口型</h1>
    <p class="step-desc">为每个分镜添加 AI 配音，支持多种音色和情感表达</p>

    <div class="toolbar">
      <div class="voice-selector">
        <label>音色选择：</label>
        <el-select v-model="selectedVoice" size="default">
          <el-option label="男声-沉稳" value="male-calm" />
          <el-option label="男声-热血" value="male-passionate" />
          <el-option label="女声-温柔" value="female-gentle" />
          <el-option label="女声-活泼" value="female-lively" />
          <el-option label="少年音" value="youth" />
          <el-option label="旁白-专业" value="narration-pro" />
        </el-select>
      </div>
      <button class="btn-primary" @click="generateAllVoices" :disabled="isGenerating">
        <span v-if="isGenerating">⏳ 生成中...</span>
        <span v-else>🎙️ 批量生成配音</span>
      </button>
    </div>

    <div class="voice-list">
      <div class="voice-card" v-for="(scene, index) in scenes" :key="scene.id">
        <div class="voice-header">
          <span class="voice-number">分镜 {{ index + 1 }}</span>
          <div class="voice-meta">
            <span class="voice-duration">{{ scene.duration }}s</span>
            <span v-if="getVoiceTrack(scene.id)?.voiceSource" class="voice-source">{{ getVoiceSourceLabel(getVoiceTrack(scene.id)?.voiceSource) }}</span>
          </div>
        </div>
        <div class="voice-body">
          <div class="voice-text">
            <el-input
              v-model="scene.narration"
              type="textarea"
              :rows="2"
              placeholder="输入这个分镜的台词/旁白..."
            />
          </div>
          <div class="voice-controls">
            <div class="voice-player" v-if="getVoiceTrack(scene.id)">
              <audio :src="getVoiceTrack(scene.id)?.audioUrl" controls />
            </div>
            <div v-else class="voice-placeholder">暂无配音</div>
            <button class="btn-ghost btn-sm" @click="generateVoice(scene.id)" :disabled="generatingScenes[scene.id] || isGenerating">
              <span v-if="generatingScenes[scene.id]">生成中...</span>
              <span v-else>生成配音</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="step-actions">
      <button class="btn-secondary" @click="goBack">← 上一步</button>
      <button class="btn-primary" @click="saveAndNext">保存并下一步 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { aiService } from '@/services/ai'
import { useProjectStore } from '@/stores/project'
import type { Scene, VoiceTrack } from '@/types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const selectedVoice = ref('narration-pro')
const isGenerating = ref(false)
const generatingScenes = ref<Record<string, boolean>>({})

const scenes = ref<Scene[]>([])
const voiceTracks = ref<VoiceTrack[]>([])

onMounted(() => {
  const project = projectStore.currentProject
  if (!project) return

  scenes.value = [...(project.scenes || [])]
  voiceTracks.value = [...(project.voiceTracks || [])]
})

watch(scenes, (value) => {
  const project = projectStore.currentProject
  if (!project) return
  project.scenes = value
}, { deep: true })

watch(voiceTracks, (value) => {
  const project = projectStore.currentProject
  if (!project) return
  project.voiceTracks = value
}, { deep: true })

function getVoiceTrack(sceneId: string) {
  return voiceTracks.value.find(v => v.sceneId === sceneId)
}

function getVoiceSourceLabel(source?: string) {
  const sourceMap: Record<string, string> = {
    'edge-tts': 'Edge TTS',
    gtts: 'gTTS',
    'local-fallback': '本地兜底',
  }
  return sourceMap[source || ''] || '未知来源'
}

async function generateVoice(sceneId: string) {
  const scene = scenes.value.find(s => s.id === sceneId)
  if (!scene) return

  const text = (scene.narration || '').trim()
  if (!text) {
    ElMessage.warning(`分镜 ${scene.order} 还没有台词/旁白`)
    return
  }

  generatingScenes.value[sceneId] = true
  try {
    const result = await aiService.generateVoice(text, selectedVoice.value, sceneId)
    const existing = voiceTracks.value.find(v => v.sceneId === sceneId)

    if (existing) {
      existing.text = text
      existing.audioUrl = result.audioUrl
      existing.voiceSource = result.voiceSource
      existing.duration = scene.duration || existing.duration || 0
    } else {
      voiceTracks.value.push({
        id: `voice-${sceneId}-${Date.now()}`,
        sceneId,
        roleId: '',
        text,
        audioUrl: result.audioUrl,
        voiceSource: result.voiceSource,
        duration: scene.duration || 0,
        startTime: 0,
      })
    }

    const sourceLabel = getVoiceSourceLabel(result.voiceSource)
    ElMessage.success(`分镜 ${scene.order} 配音生成成功（来源：${sourceLabel}）`)
  } catch (error: any) {
    ElNotification.error({
      title: `分镜 ${scene.order} 配音失败`,
      message: error?.message || '请稍后重试',
      duration: 5000,
    })
  } finally {
    generatingScenes.value[sceneId] = false
  }
}

async function generateAllVoices() {
  const candidates = scenes.value.filter(s => (s.narration || '').trim())
  if (candidates.length === 0) {
    ElMessage.warning('请先填写分镜台词/旁白')
    return
  }

  isGenerating.value = true
  let success = 0

  try {
    for (const scene of candidates) {
      try {
        await generateVoice(scene.id)
        if (getVoiceTrack(scene.id)?.audioUrl) {
          success += 1
        }
      } catch {
        // 单条失败不阻断批量流程
      }
    }

    if (projectStore.currentProject) {
      await projectStore.saveCurrentProject()
    }

    if (success > 0) {
      ElNotification.success({
        title: '批量生成完成',
        message: `成功生成 ${success}/${candidates.length} 条配音`,
        duration: 4000,
      })
    } else {
      ElNotification.warning({
        title: '批量生成未成功',
        message: '请检查 AI 配音服务是否可用',
        duration: 5000,
      })
    }
  } finally {
    isGenerating.value = false
  }
}

function goBack() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard-video`)
}

function saveAndNext() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/video-preview`)
}
</script>

<style scoped lang="scss">
.step-view { max-width: 800px; }
.step-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.step-desc { font-size: 14px; color: #999; margin-bottom: 24px; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.voice-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  label { font-size: 14px; color: #999; }
}

.voice-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.voice-card {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

.voice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.voice-number { font-size: 14px; font-weight: 700; color: #4CAF50; }
.voice-meta { display: flex; align-items: center; gap: 8px; }
.voice-duration { font-size: 12px; color: #666; }
.voice-source {
  font-size: 11px;
  color: #9fd1ff;
  background: rgba(77, 130, 187, 0.18);
  border: 1px solid rgba(98, 153, 214, 0.35);
  border-radius: 999px;
  padding: 2px 8px;
}

.voice-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-controls {
  display: flex;
  align-items: center;
  gap: 12px;

  audio {
    height: 32px;
    flex: 1;
  }
}

.voice-placeholder {
  font-size: 13px;
  color: #666;
  flex: 1;
}

.btn-sm { padding: 4px 12px; font-size: 12px; }

.step-actions {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
}
</style>
