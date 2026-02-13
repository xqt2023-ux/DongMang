<template>
  <div class="step-view scene-assets">
    <h1 class="step-title">场景角色道具</h1>
    <p class="step-desc">管理故事中的角色形象、场景背景和道具素材</p>

    <!-- Tab 切换 -->
    <div class="asset-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 角色列表 -->
    <div class="asset-section" v-show="activeTab === 'roles'">
      <div class="asset-grid">
        <div class="asset-card add-card" @click="showAddRole = true">
          <span class="add-icon">+</span>
          <span>添加角色</span>
        </div>
        <div class="asset-card" v-for="role in roles" :key="role.id">
          <div class="asset-thumb">
            <img v-if="role.avatarUrl" :src="role.avatarUrl" alt="" />
            <span v-else class="placeholder-icon">👤</span>
          </div>
          <div class="asset-info">
            <h4>{{ role.name }}</h4>
            <p>{{ role.description || '暂无描述' }}</p>
          </div>
          <div class="asset-actions">
            <button 
              class="btn-ghost btn-sm" 
              :disabled="generatingRoles.has(role.id)"
              @click="generateRoleAvatar(role.id)"
            >
              <span v-if="generatingRoles.has(role.id)">⏳ 生成中...</span>
              <span v-else>AI 生成</span>
            </button>
            <button class="btn-ghost btn-sm danger" @click="removeRole(role.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 场景列表 -->
    <div class="asset-section" v-show="activeTab === 'scenes'">
      <div class="asset-grid">
        <div class="asset-card add-card" @click="addSceneBg">
          <span class="add-icon">+</span>
          <span>添加场景</span>
        </div>
        <div class="asset-card" v-for="bg in sceneBgs" :key="bg.id">
          <div class="asset-thumb">
            <img v-if="bg.imageUrl" :src="bg.imageUrl" alt="" />
            <span v-else class="placeholder-icon">🌄</span>
          </div>
          <div class="asset-info">
            <h4>{{ bg.name }}</h4>
            <p>{{ bg.description || '暂无描述' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 道具列表 -->
    <div class="asset-section" v-show="activeTab === 'props'">
      <div class="asset-grid">
        <div class="asset-card add-card" @click="addProp">
          <span class="add-icon">+</span>
          <span>添加道具</span>
        </div>
        <div class="asset-card" v-for="prop in props" :key="prop.id">
          <div class="asset-thumb">
            <img v-if="prop.imageUrl" :src="prop.imageUrl" alt="" />
            <span v-else class="placeholder-icon">⚔️</span>
          </div>
          <div class="asset-info">
            <h4>{{ prop.name }}</h4>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加角色弹窗 -->
    <el-dialog v-model="showAddRole" title="添加角色" width="480px">
      <div class="dialog-form">
        <div class="form-group">
          <label class="form-label">角色名称</label>
          <el-input v-model="newRole.name" placeholder="输入角色名称" />
        </div>
        <div class="form-group">
          <label class="form-label">角色描述</label>
          <el-input v-model="newRole.description" type="textarea" :rows="3" placeholder="描述角色外观、性格特征..." />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showAddRole = false">取消</button>
        <button class="btn-primary" @click="confirmAddRole">确定</button>
      </template>
    </el-dialog>

    <div class="step-actions">
      <button class="btn-secondary" @click="goBack">← 上一步</button>
      <button class="btn-primary" @click="saveAndNext">保存并下一步 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { aiService } from '@/services'
import type { Role, SceneBackground, Prop } from '@/types'

const route = useRoute()
const router = useRouter()

const activeTab = ref('roles')
const tabs = [
  { key: 'roles', label: '角色' },
  { key: 'scenes', label: '场景' },
  { key: 'props', label: '道具' },
]

const roles = ref<Role[]>([])
const sceneBgs = ref<SceneBackground[]>([])
const props = ref<Prop[]>([])

const showAddRole = ref(false)
const newRole = reactive({ name: '', description: '' })
const generatingRoles = ref<Set<string>>(new Set())

function confirmAddRole() {
  if (!newRole.name.trim()) return
  roles.value.push({
    id: Date.now().toString(36),
    name: newRole.name,
    description: newRole.description,
    avatarUrl: '',
  })
  newRole.name = ''
  newRole.description = ''
  showAddRole.value = false
}

function removeRole(id: string) {
  roles.value = roles.value.filter(r => r.id !== id)
}

async function generateRoleAvatar(roleId: string) {
  const role = roles.value.find(r => r.id === roleId)
  if (!role) return
  
  if (!role.description?.trim()) {
    ElMessage.warning('请先添加角色描述，以便AI生成更准确的形象')
    return
  }
  
  generatingRoles.value.add(roleId)
  ElMessage.info(`正在为 ${role.name} 生成角色形象...`)
  
  try {
    const imageUrl = await aiService.generateRoleImage(role, 'japanese')
    role.avatarUrl = imageUrl
    ElMessage.success(`${role.name} 的形象已生成`)
  } catch (error) {
    console.error('生成角色形象失败:', error)
    ElMessage.error('生成失败，请稍后重试')
  } finally {
    generatingRoles.value.delete(roleId)
  }
}

function addSceneBg() {
  sceneBgs.value.push({
    id: Date.now().toString(36),
    name: `场景 ${sceneBgs.value.length + 1}`,
    description: '',
    imageUrl: '',
  })
}

function addProp() {
  props.value.push({
    id: Date.now().toString(36),
    name: `道具 ${props.value.length + 1}`,
    description: '',
    imageUrl: '',
  })
}

function goBack() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/story-script`)
}

function saveAndNext() {
  const projectId = route.params.id as string
  router.push(`/editor/${projectId}/storyboard`)
}
</script>

<style scoped lang="scss">
.step-view { max-width: 900px; }
.step-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.step-desc { font-size: 14px; color: #999; margin-bottom: 24px; }

.asset-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: #1a1a1a;
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
}

.tab-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    background: #4CAF50;
    color: white;
    font-weight: 600;
  }
  &:hover:not(.active) {
    color: #eaeaea;
  }
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.asset-card {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;

  &:hover { border-color: rgba(76, 175, 80, 0.3); }

  &.add-card {
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-style: dashed;
    color: #666;
    min-height: 160px;
    font-size: 14px;
    gap: 8px;

    &:hover { color: #4CAF50; border-color: #4CAF50; }
  }
}

.add-icon { font-size: 28px; }

.asset-thumb {
  width: 100%;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  img { width: 100%; height: 100%; object-fit: cover; }
  .placeholder-icon { font-size: 32px; }
}

.asset-info {
  h4 { font-size: 14px; font-weight: 600; color: #eaeaea; }
  p { font-size: 12px; color: #666; margin-top: 4px; }
}

.asset-actions {
  display: flex;
  gap: 8px;
}

.btn-sm { padding: 4px 12px; font-size: 12px; }
.danger { color: #F44336 !important; border-color: rgba(244, 67, 54, 0.3) !important; }

.dialog-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 13px; font-weight: 600; color: #ccc; }

.step-actions {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
}
</style>
