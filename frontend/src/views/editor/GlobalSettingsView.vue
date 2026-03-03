<template>
  <div class="step-view global-settings">
    <h1 class="step-title">全局设定</h1>
    <p class="step-desc">设置故事的基础信息，包括标题、类型、画面风格和画面比例</p>

    <div class="form-section">
      <div class="form-group">
        <label class="form-label">项目标题</label>
        <el-input
          v-model="form.title"
          placeholder="给你的漫剧起个名字"
          size="large"
        />
      </div>

      <div class="form-group">
        <label class="form-label">故事类型</label>
        <div class="type-grid">
          <div
            v-for="st in storyTypes"
            :key="st.key"
            class="type-card"
            :class="{ active: form.storyType === st.key }"
            @click="form.storyType = st.key"
          >
            {{ st.label }}
          </div>
        </div>
      </div>

      <div class="form-group" v-if="form.storyType === 'custom'">
        <label class="form-label">自定义故事类型</label>
        <el-input v-model="form.customStoryType" placeholder="输入自定义类型" />
      </div>

      <div class="form-group">
        <label class="form-label">画面风格</label>
        <div class="style-grid">
          <div
            v-for="style in animeStyles"
            :key="style.id"
            class="style-card"
            :class="{ active: form.animeStyle === style.id }"
            @click="form.animeStyle = style.id"
          >
            <span class="style-emoji">{{ style.emoji }}</span>
            <span class="style-name">{{ style.name }}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">画面比例</label>
        <div class="ratio-grid">
          <div
            v-for="ratio in ratios"
            :key="ratio.key"
            class="ratio-card"
            :class="{ active: form.aspectRatio === ratio.key }"
            @click="form.aspectRatio = ratio.key"
          >
            <div class="ratio-preview" :style="ratioPreviewStyle(ratio)"></div>
            <span>{{ ratio.label }}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">整体基调</label>
        <el-input
          v-model="form.tone"
          type="textarea"
          :rows="3"
          placeholder="描述故事的整体氛围和基调，如：史诗恢弘、轻松幽默、暗黑悬疑..."
        />
      </div>
    </div>

    <div class="step-actions">
      <button class="btn-primary" @click="saveAndNext">
        保存并下一步 →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { STORY_TYPES, ASPECT_RATIOS } from '@/types'
import { useProjectStore } from '@/stores/project'
import type { StoryType, AnimeStyle, AspectRatio } from '@/types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const storyTypes = STORY_TYPES
const ratios = ASPECT_RATIOS

const animeStyles = [
  { id: 'cinematic' as AnimeStyle, name: '电影质感', emoji: '🎬' },
  { id: 'japanese' as AnimeStyle, name: '日式动漫', emoji: '🌸' },
  { id: 'chinese' as AnimeStyle, name: '国漫风格', emoji: '🏮' },
  { id: 'ink-wash' as AnimeStyle, name: '水墨风', emoji: '🖌️' },
  { id: 'realistic' as AnimeStyle, name: '写实风格', emoji: '🎭' },
  { id: 'chibi' as AnimeStyle, name: 'Q版萌系', emoji: '🧸' },
  { id: 'watercolor' as AnimeStyle, name: '水彩风格', emoji: '🎨' },
  { id: 'pixel' as AnimeStyle, name: '像素风格', emoji: '👾' },
]

const form = reactive({
  title: '',
  storyType: 'ancient-hero' as StoryType,
  customStoryType: '',
  animeStyle: 'cinematic' as AnimeStyle,
  aspectRatio: '16:9' as AspectRatio,
  tone: '',
})

onMounted(() => {
  const project = projectStore.currentProject
  if (!project) return

  form.title = project.title || ''
  form.storyType = (project.globalSettings?.storyType || 'ancient-hero') as StoryType
  form.customStoryType = project.globalSettings?.customStoryType || ''
  form.animeStyle = (project.globalSettings?.animeStyle || 'cinematic') as AnimeStyle
  form.aspectRatio = (project.globalSettings?.aspectRatio || '16:9') as AspectRatio
  form.tone = project.globalSettings?.tone || ''
})

watch(
  form,
  (value) => {
    const project = projectStore.currentProject
    if (!project) return

    project.title = value.title
    project.globalSettings = {
      ...project.globalSettings,
      storyType: value.storyType,
      customStoryType: value.customStoryType,
      animeStyle: value.animeStyle,
      aspectRatio: value.aspectRatio,
      tone: value.tone,
    }
  },
  { deep: true },
)

function ratioPreviewStyle(ratio: typeof ratios[0]) {
  const scale = 40
  const w = ratio.width > ratio.height ? scale : (ratio.width / ratio.height) * scale
  const h = ratio.height > ratio.width ? scale : (ratio.height / ratio.width) * scale
  return { width: `${w}px`, height: `${h}px` }
}

function saveAndNext() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/story-script`)
}
</script>

<style scoped lang="scss">
.step-view {
  max-width: 800px;
}

.step-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.step-desc {
  font-size: 14px;
  color: #999;
  margin-bottom: 32px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #ccc;
}

.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.type-card {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1e1e1e;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  transition: all var(--motion-standard);

  &:hover {
    border-color: rgba(76, 175, 80, 0.4);
    color: #eaeaea;
  }

  &.active {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.1);
    color: #4CAF50;
    font-weight: 600;
  }
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.style-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #1e1e1e;
  cursor: pointer;
  transition: all var(--motion-standard);

  .style-emoji { font-size: 28px; }
  .style-name { font-size: 12px; color: #999; }

  &:hover {
    border-color: rgba(76, 175, 80, 0.4);
  }

  &.active {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.08);
    .style-name { color: #4CAF50; font-weight: 600; }
  }
}

.ratio-grid {
  display: flex;
  gap: 16px;
}

.ratio-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #1e1e1e;
  cursor: pointer;
  font-size: 12px;
  color: #999;
  transition: all var(--motion-standard);

  &:hover { border-color: rgba(76, 175, 80, 0.4); }
  &.active {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.08);
    color: #4CAF50;
  }
}

.ratio-preview {
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.ratio-card.active .ratio-preview {
  border-color: #4CAF50;
}

.step-actions {
  margin-top: 40px;
  display: flex;
  justify-content: flex-end;
}
</style>
