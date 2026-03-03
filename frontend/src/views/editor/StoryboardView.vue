<template>
  <div class="step-view storyboard">
    <h1 class="step-title">分镜脚本</h1>
    <p class="step-desc">AI 将剧本拆分为多个分镜，每个分镜包含画面描述、台词、镜头运动</p>
    <div v-if="hasGenerationMeta" class="generation-meta">
      <el-tag size="small" :type="generationFallbackUsed ? 'warning' : 'success'">
        {{ generationFallbackUsed ? '兜底分镜' : '模型分镜' }}
      </el-tag>
      <span class="meta-text">来源模型：{{ generationModelUsed }}</span>
    </div>
    <div v-if="storyScriptPreview" class="script-preview">
      <div class="preview-head">
        <span>本次分镜输入预览</span>
        <el-tag size="small" type="info">来自故事剧本</el-tag>
      </div>
      <el-input
        :model-value="storyScriptPreview"
        type="textarea"
        :rows="3"
        readonly
        class="readonly-prompt"
      />
      <div class="preview-tip" v-if="generationFallbackUsed">
        当前为兜底分镜模式，建议先确保文本模型可用后再重新生成，以获得更强叙事一致性。
      </div>
    </div>

    <div class="toolbar">
      <button class="btn-primary" @click="generateStoryboard" :disabled="isGenerating">
        <span v-if="isGenerating">⏳ 生成中...</span>
        <span v-else">✨ AI 生成分镜</span>
      </button>
      <button class="btn-secondary" @click="generateAllImages" :disabled="scenes.length === 0">
        🎨 批量生成图片
      </button>
      <button class="btn-secondary" @click="retryFailedImages" :disabled="failedScenesCount === 0">
        🔁 重试失败项（{{ failedScenesCount }}）
      </button>
      <button class="btn-secondary" @click="addScene">+ 手动添加分镜</button>
      <div class="strict-toggle" title="开启后优先满足画面描述，再叠加一致性约束">
        <span>严格按画面描述</span>
        <el-switch v-model="strictDescriptionMode" size="small" />
      </div>
    </div>

    <div v-if="generationFallbackUsed" class="fallback-warning">
      <div class="warning-title">当前使用兜底分镜模式</div>
      <div class="warning-text">兜底模式可保证流程不中断，但剧本理解深度、角色叙事一致性和镜头细节会弱于正常模型模式。建议恢复文本模型后重新生成。</div>
    </div>

    <div class="scenes-list">
      <div class="scene-card" v-for="(scene, index) in scenes" :key="scene.id">
        <div class="scene-header">
          <span class="scene-number">分镜 {{ index + 1 }}</span>
          <div class="scene-header-actions">
            <button
              class="btn-ghost btn-sm"
              @click="generateImage(scene.id)"
              :disabled="!scene.description || isGeneratingImages[scene.id]"
            >
              <span v-if="isGeneratingImages[scene.id]">生成中...</span>
              <span v-else>{{ scene.imageUrl ? '重新生成图片' : '单个生成图片' }}</span>
            </button>
            <button class="btn-ghost btn-sm" @click="removeScene(scene.id)">删除</button>
          </div>
        </div>

        <div class="scene-body">
          <div class="scene-thumb">
            <img v-if="scene.imageUrl" :src="scene.imageUrl" alt="" />
            <div v-else class="thumb-placeholder" :class="scene.status">
              <span v-if="scene.status === 'generating'">⏳</span>
              <span v-else-if="scene.status === 'error'">❌</span>
              <span v-else>🎬</span>
              <span class="thumb-tip" v-if="scene.status === 'error'">生成失败，可点击右上角重试</span>
              <span class="thumb-tip" v-else>可点击右上角单个生成</span>
            </div>
          </div>

          <div class="scene-fields">
            <div class="field">
              <label>画面描述</label>
              <el-input
                v-model="scene.description"
                type="textarea"
                :rows="3"
                placeholder="描述这个分镜的画面内容..."
              />
            </div>

            <div class="field">
              <label>
                参照角色（强一致性）
                <el-tooltip content="优先使用你勾选的角色图作为参考，提升角色外观一致性" placement="top">
                  <el-icon style="margin-left: 4px"><QuestionFilled /></el-icon>
                </el-tooltip>
              </label>
              <el-select
                v-model="scene.roleIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                size="small"
                style="width: 100%"
                placeholder="请选择出场角色"
              >
                <el-option
                  v-for="role in projectRoles"
                  :key="role.id"
                  :label="role.name || `角色 ${role.id}`"
                  :value="role.id"
                />
              </el-select>
            </div>
            
            <!-- 翻译后的提示词显示 -->
            <div class="field" v-if="scenePrompts[scene.id]?.translatedPrompt">
              <label>
                翻译后的提示词
                <el-tag size="small" type="info" style="margin-left: 8px">AI翻译</el-tag>
              </label>
              <el-input
                :model-value="scenePrompts[scene.id].translatedPrompt"
                type="textarea"
                :rows="2"
                readonly
                class="readonly-prompt"
              />
            </div>
            
            <!-- 自定义提示词输入 -->
            <div class="field">
              <label>
                自定义提示词（可选）
                <el-tooltip content="留空则使用AI翻译的提示词，填写则覆盖AI翻译结果" placement="top">
                  <el-icon style="margin-left: 4px"><QuestionFilled /></el-icon>
                </el-tooltip>
              </label>
              <el-input
                v-model="sceneCustomPrompts[scene.id]"
                type="textarea"
                :rows="2"
                placeholder="留空使用AI翻译，填写则使用自定义英文提示词..."
              />
            </div>
            
            <!-- 负面提示词 -->
            <div class="field">
              <label>
                负面提示词（可选）
                <el-tooltip content="描述不想要的元素，如：模糊、变形、低质量等" placement="top">
                  <el-icon style="margin-left: 4px"><QuestionFilled /></el-icon>
                </el-tooltip>
              </label>
              <el-input
                v-model="sceneNegativePrompts[scene.id]"
                type="textarea"
                :rows="1"
                placeholder="例如: extra fingers, bad hands, multiple heads..."
              />
            </div>
            
            <div class="field-row">
              <div class="field">
                <label>时长（秒）</label>
                <el-input-number v-model="scene.duration" :min="1" :max="30" :step="1" size="small" />
              </div>
              <div class="field">
                <label>镜头运动</label>
                <el-select v-model="scene.cameraMovement.type" size="small">
                  <el-option label="静止" value="static" />
                  <el-option label="左移" value="pan-left" />
                  <el-option label="右移" value="pan-right" />
                  <el-option label="上移" value="pan-up" />
                  <el-option label="下移" value="pan-down" />
                  <el-option label="推进" value="zoom-in" />
                  <el-option label="拉远" value="zoom-out" />
                </el-select>
              </div>
              <div class="field">
                <label>转场效果</label>
                <el-select v-model="scene.transition" size="small">
                  <el-option label="淡入淡出" value="fade" />
                  <el-option label="左滑" value="slide-left" />
                  <el-option label="溶解" value="dissolve" />
                  <el-option label="无" value="none" />
                </el-select>
              </div>
            </div>
            <div class="field">
              <label>台词/旁白</label>
              <el-input v-model="scene.narration" type="textarea" :rows="2" placeholder="这个镜头的台词或旁白..." />
            </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { aiService } from '@/services/ai'
import { useProjectStore } from '@/stores/project'
import type { Scene } from '@/types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const isGenerating = ref(false)
const isGeneratingImages = ref<Record<string, boolean>>({})

const scenes = ref<Scene[]>([])

// 存储每个场景的提示词信息
const scenePrompts = ref<Record<string, {
  translatedPrompt: string
  fullPrompt: string
  negativePrompt?: string
  modelUsed?: string
}>>({})

// 存储用户自定义的提示词
const sceneCustomPrompts = ref<Record<string, string>>({})
const sceneNegativePrompts = ref<Record<string, string>>({})
const failedScenesCount = computed(() => scenes.value.filter(scene => scene.status === 'error').length)
const strictDescriptionMode = ref(true)
const generationModelUsed = ref('')
const generationFallbackUsed = ref(false)
const hasGenerationMeta = computed(() => !!generationModelUsed.value)
const projectRoles = computed(() => projectStore.currentProject?.roles || [])
const storyScriptPreview = computed(() => {
  const source = (projectStore.currentProject?.script || '').trim()
  if (!source) return ''

  const cleaned = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(gemini|assistant|ai)\s*(said|回复|回答)?\s*[:：]\s*/i, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= 260) return cleaned
  return `${cleaned.slice(0, 260)}...`
})

onMounted(() => {
  const project = projectStore.currentProject
  if (!project) return

  scenes.value = [...(project.scenes || [])].map((scene) => ({
    ...scene,
    description: isPlaceholderDescription(scene.description) ? '' : scene.description,
  }))
})

watch(scenes, (value) => {
  const project = projectStore.currentProject
  if (!project) return
  project.scenes = value
}, { deep: true })

function createEmptyScene(order: number): Scene {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    order,
    description: '',
    imageUrl: '',
    videoUrl: '',
    thumbnailUrl: '',
    duration: 5,
    transition: 'fade',
    roleIds: [],
    dialogue: null,
    narration: '',
    cameraMovement: { type: 'static', speed: 0.5 },
    status: 'pending',
    videoStatus: 'pending',
  }
}

function isPlaceholderDescription(value?: string): boolean {
  if (!value) return false
  const text = value.trim()
  return /^第\d+个场景的描述$/.test(text)
}

function getRoleReferenceImage(role: any): string {
  if (!role) return ''
  const forms = Array.isArray(role.roleForms) ? role.roleForms : []
  return role.avatarUrl || forms[0]?.fullBodyUrl || forms[0]?.threeViewUrl || ''
}

function normalizeName(value?: string): string {
  return (value || '').trim().toLowerCase()
}

function mapRoleIdsFromSceneData(sceneData: any): string[] {
  const project = projectStore.currentProject
  if (!project) return []

  const rolePool = project.roles || []
  const byCharacters: string[] = []
  const characterNames = Array.isArray(sceneData?.characters) ? sceneData.characters : []
  characterNames.forEach((name: string) => {
    const hit = rolePool.find((role) => normalizeName(role.name) === normalizeName(name))
    if (hit && !byCharacters.includes(hit.id)) byCharacters.push(hit.id)
  })
  if (byCharacters.length > 0) return byCharacters

  const combinedText = `${sceneData?.description || ''}\n${sceneData?.dialogue?.speaker || ''}`.toLowerCase()
  return rolePool
    .filter((role) => normalizeName(role.name) && combinedText.includes(normalizeName(role.name)))
    .map((role) => role.id)
    .slice(0, 3)
}

function collectSceneReferenceBundle(scene: Scene): {
  roleImages: string[]
  backgroundImages: string[]
  propImages: string[]
  all: string[]
} {
  const project = projectStore.currentProject
  if (!project) {
    return { roleImages: [], backgroundImages: [], propImages: [], all: [] }
  }

  const roleImages: string[] = []
  const backgroundImages: string[] = []
  const propImages: string[] = []
  const pushUnique = (bucket: string[], url?: string) => {
    const normalized = (url || '').trim()
    if (!normalized || bucket.includes(normalized)) return
    bucket.push(normalized)
  }

  const allRoleCandidates = (project.roles || [])
    .map((role) => ({ id: role.id, image: getRoleReferenceImage(role), name: normalizeName(role.name) }))
    .filter((item) => !!item.image)

  if (Array.isArray(scene.roleIds) && scene.roleIds.length > 0) {
    scene.roleIds.forEach((roleId) => {
      const hit = allRoleCandidates.find((item) => item.id === roleId)
      pushUnique(roleImages, hit?.image)
    })
  }
  if (roleImages.length === 0) {
    const descriptionText = (scene.description || '').toLowerCase()
    allRoleCandidates
      .filter((item) => item.name && descriptionText.includes(item.name))
      .slice(0, 3)
      .forEach((item) => pushUnique(roleImages, item.image))
  }
  if (roleImages.length === 0) {
    allRoleCandidates.slice(0, 3).forEach((item) => pushUnique(roleImages, item.image))
  }

  const sceneBgById = scene.backgroundId
    ? project.sceneBackgrounds?.find((bg) => bg.id === scene.backgroundId)
    : undefined
  pushUnique(backgroundImages, sceneBgById?.imageUrl)
  if (!sceneBgById) {
    const orderedBg = (project.sceneBackgrounds || [])[Math.max(scene.order - 1, 0)]
    pushUnique(backgroundImages, orderedBg?.imageUrl)
    pushUnique(backgroundImages, (project.sceneBackgrounds || []).find((bg) => !!bg.imageUrl)?.imageUrl)
  }

  ;(project.props || [])
    .filter((prop) => {
      if (!prop.imageUrl) return false
      const propName = normalizeName(prop.name)
      return !!propName && (scene.description || '').toLowerCase().includes(propName)
    })
    .slice(0, 2)
    .forEach((prop) => pushUnique(propImages, prop.imageUrl))
  if (propImages.length === 0) {
    ;(project.props || []).filter((prop) => !!prop.imageUrl).slice(0, 1).forEach((prop) => pushUnique(propImages, prop.imageUrl))
  }

  const all: string[] = []
  const pushAll = (url: string) => {
    if (!url || all.includes(url)) return
    all.push(url)
  }
  roleImages.forEach(pushAll)
  backgroundImages.forEach(pushAll)
  propImages.forEach(pushAll)

  return {
    roleImages,
    backgroundImages,
    propImages,
    all: all.slice(0, 6),
  }
}

function buildConsistencyPrompt(
  scene: Scene,
  bundle: { roleImages: string[]; backgroundImages: string[]; propImages: string[]; all: string[] },
): string {
  const project = projectStore.currentProject
  const roleNames = (project?.roles || [])
    .filter((role) => scene.roleIds?.includes(role.id))
    .map((role) => role.name)
    .filter(Boolean)
    .join('、')

  const roleHint = roleNames
    ? `角色一致性：${roleNames} 的脸型、发型、服饰、配色必须与参考图完全一致。`
    : '角色一致性：人物脸型、发型、服饰和配色必须与参考图保持一致。'

  const roleRefHint = bundle.roleImages.length > 0
    ? `角色参考图（最高优先级）数量：${bundle.roleImages.length}。必须先对齐角色参考图，再融合背景与道具。`
    : '未检测到角色参考图，请尽量使用已有角色形象图后再生成，以获得稳定角色一致性。'

  return [
    '强一致性约束：必须严格参考 referenceImages 中的角色图、背景图与道具图，不可风格漂移。',
    roleHint,
    roleRefHint,
    '场景一致性：环境结构、地形布局、主色调与光照方向保持同一世界观。',
    '道具一致性：道具形状、材质与尺寸比例与参考图一致，禁止替换为其它物件。',
    `参考图数量：${bundle.all.length}（角色${bundle.roleImages.length}/背景${bundle.backgroundImages.length}/道具${bundle.propImages.length}）。`,
  ].join('\n')
}

function mergeCustomPromptWithConsistency(
  sceneDescription: string,
  customPrompt: string | undefined,
  consistencyPrompt: string,
  strictMode: boolean,
): string {
  const baseDescription = (sceneDescription || '').trim()
  const trimmedCustom = (customPrompt || '').trim()

  if (strictMode) {
    return [
      `画面描述（最高优先级，必须严格满足）：${baseDescription}`,
      trimmedCustom ? `补充提示（次级约束）：${trimmedCustom}` : '',
      '一致性约束（辅助，不得覆盖画面描述主体）：',
      consistencyPrompt,
    ].filter(Boolean).join('\n')
  }

  if (trimmedCustom) {
    return [
      trimmedCustom,
      `必须严格符合以下画面描述：${baseDescription}`,
      consistencyPrompt,
    ].filter(Boolean).join('\n')
  }

  return [
    `画面描述（必须优先满足）：${baseDescription}`,
    consistencyPrompt,
  ].filter(Boolean).join('\n')
}

function addScene() {
  scenes.value.push(createEmptyScene(scenes.value.length + 1))
}

function removeScene(id: string) {
  scenes.value = scenes.value.filter(s => s.id !== id)
  scenes.value.forEach((s, i) => s.order = i + 1)
}

async function generateStoryboard() {
  const script = (projectStore.currentProject?.script || '').trim()
  if (!script) {
    ElMessage.warning('请先在“故事剧本”步骤生成或填写完整剧本，再生成分镜')
    return
  }
  
  isGenerating.value = true
  ElMessage.info('正在生成分镜，请稍候...')
  
  try {
    // 调用真实的 AI 分镜生成 API
    const result = await aiService.generateStoryboard(script, 'japanese', 5)
    generationModelUsed.value = result.modelUsed || 'unknown'
    generationFallbackUsed.value = !!result.fallbackUsed
    
    // 转换后端返回的数据格式为前端需要的格式
    const mappedScenes: Scene[] = result.scenes.map((scene: any, index: number) => ({
      id: `scene-${Date.now()}-${index}`,
      order: scene.order,
      description: scene.description,
      imageUrl: '',
      thumbnailUrl: '',
      videoUrl: '',
      duration: scene.suggestedDuration || 3,
      transition: (scene.suggestedTransition || 'fade') as Scene['transition'],
      cameraMovement: scene.suggestedCameraMovement || { type: 'static', speed: 0.5 },
      roleIds: mapRoleIdsFromSceneData(scene),
      dialogue: scene.dialogue,
      narration: scene.dialogue?.text || '',
      status: 'pending' as Scene['status'],
      videoStatus: 'pending' as Scene['videoStatus'],
    }))
    const validScenes = mappedScenes.filter((scene: Scene) => !isPlaceholderDescription(scene.description))
    scenes.value = validScenes
    const project = projectStore.currentProject
    if (project) project.scenes = scenes.value

    if (validScenes.length === 0) {
      throw new Error('AI 返回了占位分镜，请重试')
    }
    
    const sourceLabel = generationFallbackUsed.value
      ? `兜底模板（${generationModelUsed.value}）`
      : `模型：${generationModelUsed.value}`

    ElNotification.success({
      title: '分镜生成成功',
      message: `已生成 ${scenes.value.length} 个分镜场景，来源：${sourceLabel}`,
      duration: 3000,
    })

    if (generationFallbackUsed.value) {
      ElNotification.warning({
        title: '当前为兜底模式',
        message: '分镜已生成，但质量上限低于正常模型。建议文本模型恢复后重新生成以提高剧情贴合度。',
        duration: 4500,
      })
    }
  } catch (error: any) {
    console.error('分镜生成失败:', error)
    ElMessage.error(error?.message || '分镜生成失败，请重试')
  } finally {
    isGenerating.value = false
  }
}

async function generateImage(sceneId: string) {
  const scene = scenes.value.find(s => s.id === sceneId)
  if (!scene) return

  if (!scene.description) {
    ElMessage.warning('请先填写画面描述')
    return
  }

  isGeneratingImages.value[sceneId] = true
  scene.status = 'generating'

  try {
    const referenceBundle = collectSceneReferenceBundle(scene)
    const referenceImages = referenceBundle.all
    if (referenceBundle.roleImages.length === 0) {
      ElMessage.warning('当前分镜未匹配到角色参考图，角色一致性会下降。建议先在“场景角色道具”步骤补齐角色图。')
    }
    const mergedCustomPrompt = mergeCustomPromptWithConsistency(
      scene.description,
      sceneCustomPrompts.value[sceneId],
      buildConsistencyPrompt(scene, referenceBundle),
      strictDescriptionMode.value,
    )

    // 调用 Babelark 图片生成，支持自定义提示词和负面提示词
    const response = await aiService.generateStoryboardImage(
      scene,
      'japanese', // TODO: 从全局设置获取风格
      '9:16',
      mergedCustomPrompt,
      sceneNegativePrompts.value[sceneId], // 负面提示词
      referenceImages,
    )
    
    scene.imageUrl = response.imageUrl
    scene.thumbnailUrl = response.thumbnailUrl
    scene.status = 'generated'
    
    // 保存返回的提示词信息
    scenePrompts.value[sceneId] = {
      translatedPrompt: response.translatedPrompt || '',
      fullPrompt: response.promptUsed,
      negativePrompt: response.negativePromptUsed,
      modelUsed: response.modelUsed,
    }
    
    ElNotification.success({
      title: '图片生成成功',
      message: `分镜 ${scene.order} 的图片已生成（来源：${response.modelUsed || 'unknown'}，参考图：${referenceImages.length} 张；角色${referenceBundle.roleImages.length}/背景${referenceBundle.backgroundImages.length}/道具${referenceBundle.propImages.length}）`,
      duration: 3000,
    })
  } catch (error: any) {
    scene.status = 'error'
    console.error('图片生成失败:', error)
    ElNotification.error({
      title: '图片生成失败',
      message: error.message || '请稍后重试',
      duration: 5000,
    })
  } finally {
    isGeneratingImages.value[sceneId] = false
  }
}

async function generateAllImages() {
  const scenesWithoutImages = scenes.value.filter(s => s.description && !s.imageUrl)
  
  if (scenesWithoutImages.length === 0) {
    ElMessage.warning('所有分镜都已生成图片')
    return
  }

  ElMessage.info(`开始批量生成 ${scenesWithoutImages.length} 张图片...`)

  for (const scene of scenesWithoutImages) {
    await generateImage(scene.id)
  }

  const sourceCounter: Record<string, number> = {}
  scenesWithoutImages.forEach((scene) => {
    const source = scenePrompts.value[scene.id]?.modelUsed || 'unknown'
    sourceCounter[source] = (sourceCounter[source] || 0) + 1
  })
  const sourceSummary = Object.entries(sourceCounter)
    .map(([source, count]) => `${source}×${count}`)
    .join('，')

  ElNotification.success({
    title: '批量生成完成',
    message: `已生成 ${scenesWithoutImages.length} 张分镜图片，来源统计：${sourceSummary}`,
    duration: 5000,
  })
}

async function retryFailedImages() {
  const failed = scenes.value.filter(scene => scene.status === 'error' && !!scene.description)
  if (failed.length === 0) {
    ElMessage.warning('没有可重试的失败分镜')
    return
  }

  ElMessage.info(`开始重试 ${failed.length} 个失败分镜...`)
  for (const scene of failed) {
    await generateImage(scene.id)
  }

  const remain = scenes.value.filter(scene => scene.status === 'error').length
  if (remain === 0) {
    ElNotification.success({
      title: '重试完成',
      message: '所有失败分镜已重新生成成功',
      duration: 4000,
    })
  } else {
    ElNotification.warning({
      title: '重试完成',
      message: `仍有 ${remain} 个分镜生成失败，可继续单个重试`,
      duration: 5000,
    })
  }
}

function goBack() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/scene-assets`)
}

function saveAndNext() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard-video`)
}
</script>

<style scoped lang="scss">
.step-view { max-width: 900px; }
.step-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.step-desc { font-size: 14px; color: #999; margin-bottom: 24px; }

.generation-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -10px 0 18px;

  .meta-text {
    font-size: 12px;
    color: #9aa4af;
  }
}

.script-preview {
  margin: 0 0 18px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);

  .preview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #a7b0bb;
    font-size: 12px;
    font-weight: 600;
  }

  .preview-tip {
    margin-top: 8px;
    color: #c9a45d;
    font-size: 12px;
    line-height: 1.5;
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.strict-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #9ea7b3;
}

.fallback-warning {
  margin: -8px 0 18px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(232, 182, 88, 0.45);
  background: rgba(232, 182, 88, 0.08);

  .warning-title {
    color: #e8b658;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .warning-text {
    color: #d7c39d;
    font-size: 12px;
    line-height: 1.45;
  }
}

.scenes-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scene-card {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

.scene-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.scene-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scene-number {
  font-size: 14px;
  font-weight: 700;
  color: #4CAF50;
}

.scene-body {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.scene-thumb {
  width: 200px;
  min-width: 200px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  background: #111;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666;
  font-size: 32px;

  &.generating {
    color: #4CAF50;
    animation: pulse 1.5s ease-in-out infinite;
  }

  &.error {
    color: #ff7a7a;
  }

  .thumb-tip {
    font-size: 12px;
    color: #8e98a3;
    line-height: 1.4;
    text-align: center;
    padding: 0 12px;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.scene-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  label { 
    font-size: 12px; 
    color: #999; 
    font-weight: 600;
    display: flex;
    align-items: center;
  }
}

.readonly-prompt {
  :deep(.el-textarea__inner) {
    background-color: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.06);
    color: #888;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
  }
}

.field-row {
  display: flex;
  gap: 16px;
  .field { flex: 1; }
}

.btn-sm { padding: 4px 12px; font-size: 12px; }

.step-actions {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
}
</style>
