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
          <span class="voice-duration">{{ scene.duration }}s</span>
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
            <button class="btn-ghost btn-sm" @click="generateVoice(scene.id)">生成配音</button>
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
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Scene, VoiceTrack } from '@/types'

const route = useRoute()
const router = useRouter()

const selectedVoice = ref('narration-pro')
const isGenerating = ref(false)

const scenes = ref<Scene[]>([])
const voiceTracks = ref<VoiceTrack[]>([])

function getVoiceTrack(sceneId: string) {
  return voiceTracks.value.find(v => v.sceneId === sceneId)
}

function generateVoice(_sceneId: string) {
  // TODO: 调用 TTS 服务
}

async function generateAllVoices() {
  isGenerating.value = true
  await new Promise(r => setTimeout(r, 2000))
  isGenerating.value = false
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
.voice-duration { font-size: 12px; color: #666; }

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
