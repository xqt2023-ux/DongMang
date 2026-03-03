<template>
  <div class="step-view scene-assets">
    <div class="step-header">
      <div>
        <h1 class="step-title">场景角色道具</h1>
        <p class="step-desc">管理故事中的角色形象、场景背景和道具素材</p>
      </div>
      <div class="header-actions">
        <button class="btn-ghost accent" @click="openExtractDialog">✨ 智能提取场景/角色/道具</button>
        <button class="btn-ghost" @click="openGenerateSettings">生成设置</button>
        <button
          class="btn-ghost accent"
          :disabled="roles.length === 0"
          @click="generateAllRoles"
        >
          重新生成角色图
        </button>
        <button class="btn-primary" @click="saveAndNext">下一步</button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="asset-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span>{{ tab.label }}</span>
        <span class="tab-dot" :class="{ active: activeTab === tab.key }"></span>
      </button>
    </div>

    <!-- 角色列表 -->
    <div class="asset-section" v-show="activeTab === 'roles'">
      <div class="section-head">
        <div class="section-title">角色数：{{ roles.length }} 项</div>
        <button class="btn-ghost" @click="openAddRoleDialog">+ 添加角色</button>
      </div>

      <div v-if="roles.length === 0" class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-title">还没有角色</div>
        <div class="empty-desc">添加角色后，可生成三视图与全身照</div>
        <button class="btn-primary" @click="openAddRoleDialog">添加角色</button>
      </div>

      <div v-else class="role-list">
        <div class="role-panel" v-for="(role, index) in roles" :key="role.id">
          <div class="role-header">
            <div class="role-title">角色{{ index + 1 }}：{{ role.name }}</div>
            <div class="role-actions">
              <button class="btn-ghost btn-sm" @click="editRole(role.id)">修改角色设定</button>
              <button class="btn-ghost btn-sm danger" @click="removeRole(role.id)">删除角色</button>
            </div>
          </div>

          <div class="role-form" v-for="(form, formIndex) in getRoleForms(role)" :key="form.id">
            <div class="form-row">
              <div class="form-title">形态{{ formIndex + 1 }}：{{ form.name || role.name || '未命名角色' }}</div>
              <div class="form-actions">
                <button class="btn-ghost btn-sm" @click="editRoleForm(role.id, form.id)">编辑形态图</button>
                <button class="btn-ghost btn-sm" @click="copyRoleForm(role.id, form.id)">复制形态</button>
                <button class="btn-ghost btn-sm danger" @click="removeRoleForm(role.id, form.id)">删除形态</button>
              </div>
            </div>

            <div class="form-row meta-row">
              <div class="meta-item voice-row">
                <span class="meta-label">配音：</span>
                <span class="voice-badge">{{ role.voiceId || '赤焰少侠' }}</span>
              </div>
              <button class="btn-ghost btn-sm" :disabled="isPreviewingRole(role.id)" @click="previewVoice(role.id)">
                <span v-if="isPreviewingRole(role.id)">试听中...</span>
                <span v-else>▶ 试听</span>
              </button>
            </div>

            <div class="image-grid">
              <div class="image-card">
                <div class="image-head">
                  <span>三视图</span>
                  <button class="btn-ghost btn-xs" @click="openCardMenu">...</button>
                </div>
                <div class="image-body" @click="previewImage(form.threeViewUrl)">
                  <img v-if="form.threeViewUrl" :src="form.threeViewUrl" alt="" />
                  <div v-else class="image-placeholder">三视图待生成</div>
                </div>
                <div class="image-actions">
                  <button class="btn-ghost btn-xs" @click="previewImage(form.threeViewUrl)">⤢ 预览</button>
                  <button
                    class="btn-ghost btn-xs"
                    :disabled="generatingRoles.has(`${role.id}:three:${form.id}`)"
                    @click="openRoleReplaceDialog(role.id, form.id, 'three')"
                  >
                    <span v-if="generatingRoles.has(`${role.id}:three:${form.id}`)">生成中...</span>
                    <span v-else>⇆ 替换</span>
                  </button>
                  <button class="btn-ghost btn-xs" @click="downloadImage(form.threeViewUrl)">⬇ 下载</button>
                </div>
              </div>

              <div class="image-card">
                <div class="image-head">
                  <span>全身照</span>
                  <button class="btn-ghost btn-xs" @click="openCardMenu">...</button>
                </div>
                <div class="image-body" @click="previewImage(form.fullBodyUrl)">
                  <img v-if="form.fullBodyUrl" :src="form.fullBodyUrl" alt="" />
                  <div v-else class="image-placeholder">全身照待生成</div>
                </div>
                <div class="image-actions">
                  <button class="btn-ghost btn-xs" @click="previewImage(form.fullBodyUrl)">⤢ 预览</button>
                  <button
                    class="btn-ghost btn-xs"
                    :disabled="generatingRoles.has(`${role.id}:full:${form.id}`)"
                    @click="openRoleReplaceDialog(role.id, form.id, 'full')"
                  >
                    <span v-if="generatingRoles.has(`${role.id}:full:${form.id}`)">生成中...</span>
                    <span v-else>⇆ 替换</span>
                  </button>
                  <button class="btn-ghost btn-xs" @click="downloadImage(form.fullBodyUrl)">⬇ 下载</button>
                </div>
              </div>
            </div>

            <button class="add-form" @click="addRoleForm(role.id, form.id)">＋ 新增形态</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 场景列表 -->
    <div class="asset-section" v-show="activeTab === 'scenes'">
      <div class="scene-workbench" v-if="sceneBgs.length">
        <section class="prompt-panel">
          <div class="prompt-tabs">
            <button class="prompt-tab" :class="{ active: sceneDrawMode === 'prompt' }" @click="switchSceneDrawMode('prompt')">生成场景图</button>
            <button class="prompt-tab" :class="{ active: sceneDrawMode === 'dialog' }" @click="switchSceneDrawMode('dialog')">对话作图</button>
          </div>

          <div class="scene-selector-row">
            <div class="scene-badge">@{{ currentScene?.name || '未选择场景' }}</div>
            <button class="btn-ghost btn-sm" @click="generateScenePrompt">生成提示词</button>
          </div>

          <div class="reference-grid">
            <button
              v-for="(refUrl, idx) in currentSceneRefs"
              :key="`ref-${idx}`"
              class="ref-tile"
              @click="triggerRefUpload(idx)"
            >
              <img v-if="refUrl" :src="refUrl" alt="" />
              <template v-else>
                <span class="ref-plus">+</span>
                <span>导入参考图</span>
              </template>
            </button>
          </div>

          <div class="prompt-area">
            <textarea
              v-model="scenePromptDraft"
              class="prompt-textarea"
              placeholder="输入场景生成提示词..."
            />
          </div>

          <div class="scene-controls">
            <el-select v-model="sceneGenOptions.model" size="small" style="width: 180px">
              <el-option label="纳米修图Pro（高速版）" value="nano-pro" />
              <el-option label="纳米修图Pro（高清版）" value="nano-hd" />
            </el-select>
            <el-select v-model="sceneGenOptions.ratio" size="small" style="width: 90px">
              <el-option label="16:9" value="16:9" />
              <el-option label="9:16" value="9:16" />
            </el-select>
            <el-select v-model="sceneGenOptions.count" size="small" style="width: 80px">
              <el-option label="1张" :value="1" />
              <el-option label="4张" :value="4" />
            </el-select>
            <el-select v-model="sceneGenOptions.quality" size="small" style="width: 90px">
              <el-option label="4k" value="4k" />
              <el-option label="2k" value="2k" />
            </el-select>
          </div>

          <button class="btn-primary btn-generate" :disabled="!currentScene || isCurrentSceneGenerating" @click="generateCurrentScene">
            <span v-if="isCurrentSceneGenerating">生成中...</span>
            <span v-else>{{ sceneDrawMode === 'dialog' ? '✦ 对话作图' : '✦ 开始生图' }}</span>
          </button>
        </section>

        <section class="result-panel">
          <div class="result-toolbar">
            <div class="view-switch">
              <button class="btn-ghost btn-sm" :class="{ accent: sceneViewMode === 'list' }" @click="sceneViewMode = 'list'">☰ 列表</button>
              <button class="btn-ghost btn-sm" :class="{ accent: sceneViewMode === 'card' }" @click="sceneViewMode = 'card'">◻ 卡片</button>
            </div>
            <div class="toolbar-right-actions">
              <button class="btn-ghost btn-sm" @click="triggerMainUpload">⇪ 本地上传图片</button>
              <button class="btn-ghost btn-sm" @click="openSceneAssetImportDialog">⇪ 资源库导入图片</button>
            </div>
          </div>

          <div class="result-headline">
            <div class="scene-line">📎 {{ currentScene?.name || '未选择场景' }}</div>
            <div class="scene-meta">{{ sceneGenOptions.model }} · {{ sceneGenOptions.ratio }} · {{ sceneTimeText }}</div>
          </div>

          <div class="result-main" v-if="sceneViewMode === 'list'">
            <div class="main-preview" :class="{ picking: pointEditMode }" @click="onMainPreviewClick">
              <img v-if="currentScene?.imageUrl" :src="currentScene.imageUrl" alt="" />
              <div v-else class="asset-placeholder">场景背景待生成</div>
              <div
                v-if="selectedPoint && currentScene?.imageUrl"
                class="point-marker"
                :style="{ left: `${selectedPoint.x}%`, top: `${selectedPoint.y}%` }"
              ></div>
              <div class="preview-actions" v-if="currentScene">
                <button class="btn-mini" @click.stop="previewImage(currentScene.imageUrl)">⤢</button>
                <button class="btn-mini" @click.stop="downloadImage(currentScene.imageUrl)">⬇</button>
              </div>
            </div>

            <div class="thumb-rail">
              <button
                v-for="bg in sceneBgs"
                :key="`thumb-${bg.id}`"
                class="thumb-item"
                :class="{ active: selectedSceneId === bg.id }"
                @click="selectScene(bg.id)"
              >
                <img v-if="bg.imageUrl" :src="bg.imageUrl" alt="" />
                <span v-else>+</span>
              </button>
            </div>
          </div>

          <div class="result-grid" v-else>
            <div class="scene-result-card" v-for="bg in sceneBgs" :key="`card-${bg.id}`" @click="selectScene(bg.id)">
              <div class="asset-thumb">
                <img v-if="bg.imageUrl" :src="bg.imageUrl" alt="" />
                <div v-else class="asset-placeholder">场景背景待生成</div>
              </div>
              <div class="asset-info">
                <h4>{{ bg.name }}</h4>
                <p>{{ bg.description || '暂无描述' }}</p>
              </div>
            </div>
          </div>

          <div class="result-actions" v-if="currentScene">
            <button class="btn-ghost btn-sm" @click="addSceneBg">＋ 添加场景图</button>
            <button class="btn-ghost btn-sm" @click="generateCurrentScene">✎ 重新编辑</button>
            <button class="btn-ghost btn-sm danger" @click="removeSceneBg(currentScene.id)">🗑 删除场景</button>
            <button class="btn-ghost btn-sm" :class="{ accent: pointEditMode }" @click="togglePointEditMode">◴ 点选改图</button>
            <button class="btn-ghost btn-sm" @click="runDialogueDraw">◔ 对话作图</button>
            <button class="btn-ghost btn-sm" @click="enhanceCurrentScene">▣ 变清晰</button>
          </div>
        </section>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">🖼</div>
        <div class="empty-title">还没有场景</div>
        <div class="empty-desc">添加场景后可进入参考站式场景图生成工作台</div>
        <button class="btn-primary" @click="addSceneBg">+ 添加场景</button>
      </div>
    </div>

    <!-- 道具列表 -->
    <div class="asset-section" v-show="activeTab === 'props'">
      <div class="section-head">
        <div class="section-title">道具数：{{ props.length }} 项</div>
        <button class="btn-ghost" @click="addProp">+ 添加道具</button>
      </div>

      <div class="asset-grid">
        <div class="asset-card" v-for="prop in props" :key="prop.id">
          <div class="asset-thumb">
            <img v-if="prop.imageUrl" :src="prop.imageUrl" alt="" />
            <div v-else class="asset-placeholder">道具图待生成</div>
          </div>
          <div class="asset-info">
            <h4>{{ prop.name }}</h4>
            <p>{{ prop.description || '暂无描述' }}</p>
          </div>
          <div class="asset-actions">
            <button
              class="btn-ghost btn-sm"
              :data-test="`generate-prop-${prop.id}`"
              :disabled="generatingProps.has(prop.id)"
              @click="generatePropImage(prop.id)"
            >
              <span v-if="generatingProps.has(prop.id)">生成中...</span>
              <span v-else>AI 生成</span>
            </button>
            <button class="btn-ghost btn-sm" @click="previewImage(prop.imageUrl)">预览</button>
            <button class="btn-ghost btn-sm" @click="removeProp(prop.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑角色弹窗 -->
    <el-dialog v-model="showAddRole" :title="editingRoleId ? '编辑角色' : '添加角色'" width="480px">
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
        <button class="btn-secondary" @click="closeRoleDialog">取消</button>
        <button class="btn-primary" @click="confirmAddRole">确定</button>
      </template>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="showPreview" title="图片预览" width="720px">
      <div class="preview-body">
        <img v-if="previewUrl" :src="previewUrl" alt="" />
        <div v-else class="preview-empty">暂无可预览图片</div>
      </div>
    </el-dialog>

    <el-dialog v-model="showAssetImport" title="从资产库导入图片" width="860px">
      <div class="import-grid" v-loading="loadingAssetLibrary">
        <button
          v-for="item in assetLibraryImages"
          :key="item.id"
          class="import-item"
          @click="applyAssetImportImage(item.contentUrl)"
        >
          <img :src="item.contentUrl" :alt="item.name" />
          <span>{{ item.name }}</span>
        </button>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showAssetImport = false">关闭</button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRoleReplaceDialog" title="选择角色" width="1240px">
      <div class="replace-source-tabs single">
        <button class="source-tab active">本作品资产</button>
      </div>

      <div class="replace-role-chips" v-if="roleReplaceRoleOptions.length">
        <button
          v-for="item in roleReplaceRoleOptions"
          :key="`replace-role-${item.id}`"
          class="role-chip"
          :class="{ active: item.id === roleReplaceRoleId }"
          @click="roleReplaceRoleId = item.id"
        >
          {{ item.name }}
        </button>
      </div>

      <div class="replace-grid">
        <button
          v-for="item in roleReplaceDisplayItems"
          :key="item.id"
          class="replace-item"
          :class="{ active: roleReplaceSelectionId === item.id }"
          @click="selectRoleReplaceItem(item.id)"
        >
          <img :src="item.url" :alt="item.name" />
          <span class="replace-time">{{ item.timeText }}</span>
          <span class="replace-check">{{ roleReplaceSelectionId === item.id ? '✓' : '' }}</span>
        </button>
        <div v-if="roleReplaceDisplayItems.length === 0" class="replace-empty">
          当前来源暂无可替换图片
        </div>
      </div>

      <template #footer>
        <button class="btn-secondary" @click="triggerRoleReplaceUpload">⇧ 选择本地文件</button>
        <button class="btn-secondary" @click="openAssetImportDialog('role')">⟲ 资产库导入</button>
        <button class="btn-secondary" @click="showRoleReplaceDialog = false">取消</button>
        <button class="btn-primary" :disabled="!roleReplaceSelectionId" @click="confirmRoleReplace">确定</button>
      </template>
    </el-dialog>

    <input
      ref="sceneUploadInput"
      type="file"
      accept="image/*"
      class="file-input"
      @change="handleSceneUpload"
    />

    <input
      ref="roleUploadInput"
      type="file"
      accept="image/*"
      class="file-input"
      @change="handleRoleUpload"
    />

    <input
      ref="roleReplaceUploadInput"
      type="file"
      accept="image/*"
      class="file-input"
      @change="handleRoleReplaceUpload"
    />

    <!-- 形态图编辑弹窗 -->
    <el-dialog v-model="showEditForm" title="编辑形态图" width="1240px">
      <div class="filmstrip-header" v-if="roles.length">
        <span class="filmstrip-title">角色胶片条</span>
        <div class="filmstrip-nav">
          <button class="film-nav-btn" @click="scrollFilmstrip('role', -1)">‹</button>
          <button class="film-nav-btn" @click="scrollFilmstrip('role', 1)">›</button>
        </div>
      </div>

      <div class="dialog-filmstrip role-strip" v-if="roles.length">
        <div ref="roleStripRef" class="filmstrip-scroll">
        <button
          v-for="role in roles"
          :key="`role-film-${role.id}`"
          class="film-item role-film"
          :class="{ active: role.id === editingForm.roleId }"
          @click="switchEditingDialogRole(role.id)"
        >
          <div class="film-thumb">
            <img v-if="getRoleAvatar(role)" :src="getRoleAvatar(role)" alt="" />
            <div v-else class="film-thumb-placeholder">无图</div>
          </div>
          <span class="film-name">{{ role.name || '未命名角色' }}</span>
        </button>
        </div>
      </div>

      <div class="dialog-filmstrip form-strip" v-if="editingRoleForms.length">
        <button
          v-for="form in editingRoleForms"
          :key="`film-${form.id}`"
          class="film-item"
          :class="{ active: form.id === editingForm.formId }"
          @click="switchEditingDialogForm(form.id)"
        >
          <div class="film-thumb">
            <img v-if="form.fullBodyUrl || form.threeViewUrl" :src="form.fullBodyUrl || form.threeViewUrl" alt="" />
            <div v-else class="film-thumb-placeholder">无图</div>
          </div>
          <span class="film-name">{{ form.name || '未命名形态' }}</span>
        </button>
      </div>

      <div class="edit-form-dialog ref-layout">
        <div class="edit-form-left">
          <div class="role-mode-tabs">
            <button class="prompt-tab" :class="{ active: roleEditMode === 'prompt' }" @click="roleEditMode = 'prompt'">生成角色图</button>
            <button class="prompt-tab" :class="{ active: roleEditMode === 'dialog' }" @click="roleEditMode = 'dialog'">对话作图</button>
          </div>

          <div class="role-target-tabs">
            <button class="btn-ghost btn-sm" :class="{ accent: editingForm.target === 'three' }" @click="editingForm.target = 'three'">三视图</button>
            <button
              class="btn-ghost btn-sm"
              :class="{ accent: editingForm.target === 'full', required: missingThreeViewReference }"
              @click="editingForm.target = 'full'"
            >
              全身照
              <span v-if="missingThreeViewReference" class="required-dot"></span>
              <span v-if="missingThreeViewReference" class="required-text">必需</span>
            </button>
            <button
              class="btn-ghost btn-sm"
              :class="{ accent: strictThreeViewMode }"
              @click="strictThreeViewMode = !strictThreeViewMode"
            >
              严格三视图：{{ strictThreeViewMode ? '开' : '关' }}
            </button>
            <button
              class="btn-ghost btn-sm"
              :class="{ accent: strongReferenceMode }"
              @click="strongReferenceMode = !strongReferenceMode"
            >
              强参考模式：{{ strongReferenceMode ? '开' : '关' }}
            </button>
          </div>

          <div class="role-ref-tip">
            <div class="tip-title">上传图片，一键生成正/侧/背面三视图</div>
            <div class="tip-sub">角色形象越清晰，生成一致性越好</div>
          </div>

          <div class="edit-left-preview">
            <img v-if="currentEditingPreview" :src="currentEditingPreview" alt="" />
            <div v-else class="preview-empty">暂无角色图</div>
            <div class="preview-actions left-corner-actions">
              <button class="btn-mini" @click.stop="triggerRoleUpload">⇪</button>
              <button class="btn-mini" @click.stop="openAssetImportDialog('role')">↗</button>
              <button class="btn-mini" @click.stop="downloadImage(currentEditingPreview)">⬇</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">形态描述（用于生成）</label>
            <el-input
              v-model="editingForm.description"
              type="textarea"
              :rows="4"
              placeholder="描述服饰、神态、动作、光影、镜头感..."
            />
          </div>

          <button class="btn-primary btn-generate" :disabled="!editingForm.description.trim() || generatingEditForm || missingThreeViewReference" @click="regenerateEditingForm">
            <span v-if="generatingEditForm">生成中...</span>
            <span v-else-if="missingThreeViewReference">请先生成/上传全身照（作为三视图参考）</span>
            <span v-else>{{ editingForm.target === 'three' ? '✦ 生成三视图  消耗 🥜 8' : '✦ 生成全身照  消耗 🥜 8' }}</span>
          </button>
        </div>

        <div class="edit-form-right">
          <div class="result-toolbar">
            <div class="view-switch">
              <button class="btn-ghost btn-sm" :class="{ accent: roleResultViewMode === 'list' }" @click="roleResultViewMode = 'list'">☰ 列表</button>
              <button class="btn-ghost btn-sm" :class="{ accent: roleResultViewMode === 'card' }" @click="roleResultViewMode = 'card'">◻ 卡片</button>
            </div>
            <div class="toolbar-right-actions">
              <button class="btn-ghost btn-sm" @click="triggerRoleUpload">⇪ 本地上传图片</button>
              <button class="btn-ghost btn-sm" @click="openAssetImportDialog('role')">⇪ 资源库导入图片</button>
            </div>
          </div>

          <div class="result-main" v-if="roleResultViewMode === 'list'">
            <div class="edit-preview-box" :class="{ picking: rolePointEditMode }" @click="onRolePreviewClick">
              <img v-if="currentEditingPreview" :src="currentEditingPreview" alt="" />
              <div v-else class="preview-empty">暂无图片，点击“生成形态图”</div>
              <div
                v-if="roleEditPoint && currentEditingPreview"
                class="point-marker"
                :style="{ left: `${roleEditPoint.x}%`, top: `${roleEditPoint.y}%` }"
              ></div>
            </div>

            <div class="thumb-rail" v-if="editingRoleForms.length">
              <button
                v-for="form in editingRoleForms"
                :key="`strip-${form.id}`"
                class="thumb-item"
                :class="{ active: form.id === editingForm.formId }"
                @click="switchEditingDialogForm(form.id)"
              >
                <img v-if="form.fullBodyUrl || form.threeViewUrl" :src="form.fullBodyUrl || form.threeViewUrl" alt="" />
                <span v-else>+</span>
              </button>
            </div>
          </div>

          <div class="result-grid" v-else>
            <div class="scene-result-card" v-for="form in editingRoleForms" :key="`card-form-${form.id}`" @click="switchEditingDialogForm(form.id)">
              <div class="asset-thumb">
                <img v-if="form.fullBodyUrl || form.threeViewUrl" :src="form.fullBodyUrl || form.threeViewUrl" alt="" />
                <div v-else class="asset-placeholder">形态待生成</div>
              </div>
              <div class="asset-info">
                <h4>{{ form.name || '未命名形态' }}</h4>
                <p>{{ getRoleFormModel(form.id) }} · {{ getRoleFormTime(form.id) }}</p>
              </div>
            </div>
          </div>

          <div class="edit-actions role-actions-2">
            <button class="btn-ghost btn-sm danger" @click="removeRoleForm(editingForm.roleId, editingForm.formId)">⊗ 取消添加</button>
            <button class="btn-ghost btn-sm" @click="runGenerateThreeView">◌ 生成三视图</button>
            <button class="btn-ghost btn-sm" @click="regenerateEditingForm">✎ 重新编辑</button>
            <button class="btn-ghost btn-sm" :class="{ accent: rolePointEditMode }" @click="toggleRolePointEdit">◔ 点选改图</button>
            <button class="btn-ghost btn-sm" @click="runRoleDialogueDraw">◔ 对话作图</button>
            <button class="btn-ghost btn-sm" @click="enhanceRoleImage">▣ 变清晰</button>
          </div>

          <div class="role-result-list" v-if="editingRoleForms.length">
            <div class="result-row" v-for="form in editingRoleForms" :key="`row-${form.id}`" @click="switchEditingDialogForm(form.id)">
              <div class="result-row-left">
                <span class="result-tag">{{ editingForm.target === 'three' ? '三视图' : '全身照' }}</span>
                <span class="result-name">角色：{{ editingForm.name || form.name || '未命名形态' }}</span>
              </div>
              <div class="result-row-meta">
                <span>{{ getRoleFormModel(form.id) }}</span>
                <span>{{ getRoleFormTime(form.id) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-secondary" @click="closeEditRoleForm">取消</button>
        <button class="btn-primary" @click="saveEditRoleForm">保存</button>
      </template>
    </el-dialog>

    <!-- 场景/角色/道具提取弹窗 -->
    <el-dialog v-model="showExtractDialog" title="提取场景/角色/道具" width="860px">
      <div class="extract-dialog-body">
        <p class="extract-subtitle">选择智能体来为您精准提取（基于完整剧本）</p>
        <div v-if="extractMeta.modelUsed" class="extract-meta">
          <el-tag size="small" :type="extractMeta.fallbackUsed ? 'warning' : 'success'">
            {{ extractMeta.fallbackUsed ? '兜底提取' : '模型提取' }}
          </el-tag>
          <span>来源模型：{{ extractMeta.modelUsed }}</span>
        </div>

        <div class="extract-group">
          <div class="extract-label">场景提取智能体</div>
          <el-select v-model="extractAgents.sceneAgent" size="large" style="width: 100%">
            <el-option label="场景编剧（漫画版v3）" value="scene-writer-v3" />
            <el-option label="场景编剧（电影版v2）" value="scene-writer-v2" />
          </el-select>
        </div>

        <div class="extract-group">
          <div class="extract-label">角色提取智能体</div>
          <el-select v-model="extractAgents.roleAgent" size="large" style="width: 100%">
            <el-option label="角色编剧（漫画版v3）" value="role-writer-v3" />
            <el-option label="角色编剧（剧情版v2）" value="role-writer-v2" />
          </el-select>
        </div>

        <div class="extract-group">
          <div class="extract-label">道具提取智能体</div>
          <el-select v-model="extractAgents.propAgent" size="large" style="width: 100%">
            <el-option label="道具编剧（漫画版v3）" value="prop-writer-v3" />
            <el-option label="道具编剧（细节增强v2）" value="prop-writer-v2" />
          </el-select>
        </div>

        <div v-if="extractPreview" class="extract-preview">
          <div class="preview-title">提取预览（确认后写入）</div>
          <div class="preview-grid">
            <div class="preview-col">
              <div class="preview-head">场景（{{ extractPreview.scenes.length }}）</div>
              <ul>
                <li v-for="item in extractPreview.scenes" :key="`s-${item.name}`">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.description || '暂无描述' }}</span>
                </li>
              </ul>
            </div>
            <div class="preview-col">
              <div class="preview-head">角色（{{ extractPreview.roles.length }}）</div>
              <ul>
                <li v-for="item in extractPreview.roles" :key="`r-${item.name}`">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.description || '暂无描述' }}</span>
                </li>
              </ul>
            </div>
            <div class="preview-col">
              <div class="preview-head">道具（{{ extractPreview.props.length }}）</div>
              <ul>
                <li v-for="item in extractPreview.props" :key="`p-${item.name}`">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.description || '暂无描述' }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-secondary" @click="showExtractDialog = false">取消</button>
        <button class="btn-ghost" :disabled="isExtracting" @click="startExtractAssets">
          <span v-if="isExtracting">提取中...</span>
          <span v-else>🪄 开始提取</span>
        </button>
        <button class="btn-primary" :disabled="!extractPreview || isApplyingExtract" @click="applyExtractResult">
          <span v-if="isApplyingExtract">写入中...</span>
          <span v-else>确认写入</span>
        </button>
      </template>
    </el-dialog>

    <div class="step-actions">
      <button class="btn-secondary" @click="goBack">← 上一步</button>
      <button class="btn-primary" @click="saveAndNext">保存并下一步 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { aiService, assetService } from '@/services'
import type { ExtractAssetsResult } from '@/services/ai'
import type { AssetItem } from '@/services/asset'
import { useProjectStore } from '@/stores/project'
import type { Role, SceneBackground, Prop, RoleForm } from '@/types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

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
const showPreview = ref(false)
const previewUrl = ref('')
const showEditForm = ref(false)
const showExtractDialog = ref(false)
const editingRoleId = ref<string | null>(null)
const newRole = reactive({ name: '', description: '' })
const editingForm = reactive({
  roleId: '',
  formId: '',
  name: '',
  description: '',
  avatarUrl: '',
  threeViewUrl: '',
  fullBodyUrl: '',
  target: 'full' as 'three' | 'full',
})
const generatingEditForm = ref(false)
const roleEditMode = ref<'prompt' | 'dialog'>('prompt')
const rolePointEditMode = ref(false)
const roleEditPoint = ref<{ x: number; y: number } | null>(null)
const strictThreeViewMode = ref(false)
const strongReferenceMode = ref(false)
const roleResultViewMode = ref<'list' | 'card'>('list')
const roleFormMeta = ref<Record<string, { updatedAt: string; model: string }>>({})
const roleVoicePreviewing = ref<Record<string, boolean>>({})
const roleVoicePreviewCache = ref<Record<string, string>>({})
const activePreviewRoleId = ref('')
const roleStripRef = ref<HTMLElement | null>(null)
const isExtracting = ref(false)
const isApplyingExtract = ref(false)
const extractPreview = ref<ExtractAssetsResult | null>(null)
const extractMeta = reactive({
  modelUsed: '',
  fallbackUsed: false,
})
const generatingRoles = ref<Set<string>>(new Set())
const generatingBackgrounds = ref<Set<string>>(new Set())
const generatingProps = ref<Set<string>>(new Set())
const selectedSceneId = ref('')
const sceneViewMode = ref<'list' | 'card'>('list')
const scenePromptDraft = ref('')
const showAssetImport = ref(false)
const loadingAssetLibrary = ref(false)
const assetLibraryImages = ref<AssetItem[]>([])
const assetImportTarget = ref<'scene' | 'role'>('scene')
const showRoleReplaceDialog = ref(false)
const roleReplaceRoleId = ref('')
const roleReplaceSelectionId = ref('')
const roleReplaceUploadInput = ref<HTMLInputElement | null>(null)
const roleReplaceTarget = reactive({
  roleId: '',
  formId: '',
  target: 'three' as 'three' | 'full',
})
const sceneUploadInput = ref<HTMLInputElement | null>(null)
const roleUploadInput = ref<HTMLInputElement | null>(null)
const activeRefIndex = ref<number | null>(null)
const sceneRefs = ref<Record<string, string[]>>({})
const sceneGenOptions = reactive({
  model: 'nano-pro',
  ratio: '16:9',
  count: 1,
  quality: '4k',
})
const sceneDrawMode = ref<'prompt' | 'dialog'>('prompt')
const pointEditMode = ref(false)
const selectedPoint = ref<{ x: number; y: number } | null>(null)
const extractAgents = reactive({
  sceneAgent: 'scene-writer-v3',
  roleAgent: 'role-writer-v3',
  propAgent: 'prop-writer-v3',
})

const supportedVoiceTypes = ['male-calm', 'male-passionate', 'female-gentle', 'female-lively', 'youth', 'narration-pro'] as const
let rolePreviewAudio: HTMLAudioElement | null = null

function createRoleForm(role: Role, seed = Date.now()): RoleForm {
  return {
    id: `${seed}-${Math.random().toString(36).slice(2, 7)}`,
    name: role.name || '新形态',
    description: role.description || '',
    threeViewUrl: role.avatarUrl || '',
    fullBodyUrl: role.avatarUrl || '',
  }
}

function normalizeRole(role: Role): Role {
  const forms = Array.isArray(role.roleForms) ? role.roleForms : []
  const fallbackAvatar = forms[0]?.fullBodyUrl || forms[0]?.threeViewUrl || ''
  if (forms.length > 0) {
    return {
      ...role,
      avatarUrl: role.avatarUrl || fallbackAvatar,
      roleForms: forms,
    }
  }
  return {
    ...role,
    roleForms: [createRoleForm(role)],
  }
}

onMounted(() => {
  const project = projectStore.currentProject
  if (!project) return

  roles.value = [...(project.roles || [])].map(normalizeRole)
  sceneBgs.value = [...(project.sceneBackgrounds || [])]
  props.value = [...(project.props || [])]
  if (sceneBgs.value.length > 0) {
    selectedSceneId.value = sceneBgs.value[0].id
  }
})

watch(sceneBgs, (list) => {
  if (list.length === 0) {
    selectedSceneId.value = ''
    scenePromptDraft.value = ''
    return
  }
  const hit = list.some(item => item.id === selectedSceneId.value)
  if (!hit) {
    selectedSceneId.value = list[0].id
  }
}, { deep: true })

const currentScene = computed(() => sceneBgs.value.find(item => item.id === selectedSceneId.value) || null)
const isCurrentSceneGenerating = computed(() => {
  const id = currentScene.value?.id
  return id ? generatingBackgrounds.value.has(id) : false
})
const sceneTimeText = computed(() => {
  return new Date().toLocaleString('zh-CN', { hour12: false })
})
const currentSceneRefs = computed(() => {
  const id = currentScene.value?.id
  if (!id) return ['', '', '', '']
  if (!sceneRefs.value[id]) {
    sceneRefs.value[id] = ['', '', '', '']
  }
  return sceneRefs.value[id]
})

const roleReplaceRoleOptions = computed(() => {
  return roles.value.map(role => ({
    id: role.id,
    name: role.name || '未命名角色',
  }))
})

const roleReplaceDisplayItems = computed(() => {
  const role = roles.value.find(item => item.id === roleReplaceRoleId.value)
  if (!role) return []
  const forms = getRoleForms(role)
  const result: Array<{ id: string; url: string; name: string; timeText: string }> = []
  forms.forEach((form, index) => {
    if (form.fullBodyUrl) {
      result.push({
        id: `form-${form.id}-full`,
        url: form.fullBodyUrl,
        name: `${form.name || role.name || `形态${index + 1}`} · 全身`,
        timeText: getRoleFormTime(form.id),
      })
    }
    if (form.threeViewUrl) {
      result.push({
        id: `form-${form.id}-three`,
        url: form.threeViewUrl,
        name: `${form.name || role.name || `形态${index + 1}`} · 三视图`,
        timeText: getRoleFormTime(form.id),
      })
    }
  })
  return result
})

watch(currentScene, (scene) => {
  scenePromptDraft.value = scene?.description || ''
}, { immediate: true })

watch(scenePromptDraft, (value) => {
  if (currentScene.value) {
    currentScene.value.description = value
  }
})

function syncAssetsToStore() {
  const project = projectStore.currentProject
  if (!project) return

  roles.value.forEach((role) => {
    const forms = getRoleForms(role)
    const primaryForm = forms[0]
    if (primaryForm) {
      role.name = primaryForm.name || role.name
      role.description = primaryForm.description
      role.avatarUrl = primaryForm.fullBodyUrl || primaryForm.threeViewUrl || ''
    }
  })

  project.roles = roles.value
  project.sceneBackgrounds = sceneBgs.value
  project.props = props.value
}

watch(roles, syncAssetsToStore, { deep: true })
watch(sceneBgs, syncAssetsToStore, { deep: true })
watch(props, syncAssetsToStore, { deep: true })

async function persistAssetsNow() {
  try {
    syncAssetsToStore()
    await projectStore.saveCurrentProject()
  } catch (error) {
    console.error('资产持久化失败:', error)
    ElMessage.warning('已更新本地内容，但自动保存失败，请稍后重试或点击“保存并下一步”')
  }
}

function resetRoleForm() {
  newRole.name = ''
  newRole.description = ''
  editingRoleId.value = null
}

function openAddRoleDialog() {
  resetRoleForm()
  showAddRole.value = true
}

function closeRoleDialog() {
  showAddRole.value = false
  resetRoleForm()
}

function confirmAddRole() {
  if (!newRole.name.trim()) return

  if (editingRoleId.value) {
    const role = roles.value.find(r => r.id === editingRoleId.value)
    if (role) {
      role.name = newRole.name
      role.description = newRole.description
    }
  } else {
    roles.value.push({
      id: Date.now().toString(36),
      name: newRole.name,
      description: newRole.description,
      avatarUrl: '',
    })
  }

  closeRoleDialog()
}

function removeRole(id: string) {
  roles.value = roles.value.filter(r => r.id !== id)
}

function getRoleForms(role: Role): RoleForm[] {
  if (!Array.isArray(role.roleForms) || role.roleForms.length === 0) {
    role.roleForms = [createRoleForm(role)]
  }
  return role.roleForms
}

function getRoleAvatar(role: Role): string {
  if (role.avatarUrl) return role.avatarUrl
  const forms = getRoleForms(role)
  return forms[0]?.fullBodyUrl || forms[0]?.threeViewUrl || ''
}

function removeSceneBg(id: string) {
  sceneBgs.value = sceneBgs.value.filter(bg => bg.id !== id)
}

function removeProp(id: string) {
  props.value = props.value.filter(p => p.id !== id)
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
    const response = await aiService.generateRoleImage(role, 'japanese')
    const imageUrl = response.imageUrl
    role.avatarUrl = imageUrl
    const forms = getRoleForms(role)
    if (forms[0]) {
      forms[0].threeViewUrl = imageUrl
      forms[0].fullBodyUrl = imageUrl
    }
    await persistAssetsNow()
    const source = response.modelUsed || 'unknown'
    ElMessage.success(`${role.name} 的形象已生成（来源：${source}）`)
  } catch (error: any) {
    console.error('生成角色形象失败:', error)
    ElMessage.error(error?.message || '生成失败，请稍后重试')
  } finally {
    generatingRoles.value.delete(roleId)
  }
}

async function generateAllRoles() {
  if (roles.value.length === 0) return
  const candidates = roles.value.filter(role => role.description?.trim())
  if (candidates.length === 0) {
    ElMessage.warning('请先添加角色描述，以便批量生成')
    return
  }

  ElMessage.info('开始批量生成角色图...')
  for (const role of candidates) {
    await generateRoleAvatar(role.id)
  }
  ElMessage.success('角色图生成完成')
}

async function generatePropImage(propId: string) {
  const prop = props.value.find(p => p.id === propId)
  if (!prop) return

  if (!prop.description?.trim()) {
    ElMessage.warning('请先添加道具描述，以便AI生成更准确的道具')
    return
  }

  generatingProps.value.add(propId)
  ElMessage.info(`正在为 ${prop.name} 生成道具图片...`)

  try {
    const imageUrl = await aiService.generatePropImage(prop, 'japanese')
    prop.imageUrl = imageUrl
    ElMessage.success(`${prop.name} 的道具图已生成`)
  } catch (error: any) {
    console.error('生成道具图片失败:', error)
    ElMessage.error(error?.message || '生成失败，请稍后重试')
  } finally {
    generatingProps.value.delete(propId)
  }
}

function addSceneBg() {
  const newScene = {
    id: Date.now().toString(36),
    name: `场景 ${sceneBgs.value.length + 1}`,
    description: '',
    imageUrl: '',
  }
  sceneBgs.value.push(newScene)
  selectedSceneId.value = newScene.id
}

function selectScene(id: string) {
  selectedSceneId.value = id
}

function generateScenePrompt() {
  if (!currentScene.value) return
  const base = currentScene.value.name || '场景'
  if (currentScene.value.description?.trim()) {
    ElMessage.success('已保留现有提示词，可继续优化')
    return
  }
  scenePromptDraft.value = `${base}，电影级构图，主体清晰，细节丰富，光影层次分明，风格统一`
  ElMessage.success('已生成基础提示词')
}

async function generateCurrentScene() {
  if (!currentScene.value) return

  const basePrompt = scenePromptDraft.value.trim() || currentScene.value.description?.trim()
  if (!basePrompt) {
    ElMessage.warning('请先输入提示词')
    return
  }

  const id = currentScene.value.id
  generatingBackgrounds.value.add(id)
  try {
    const finalPrompt = sceneDrawMode.value === 'dialog'
      ? `${basePrompt}\n对话作图模式：保留场景主体与构图一致性，加强镜头叙事感。`
      : basePrompt

    const response = await aiService.generateSceneImage({
      description: currentScene.value.name || '场景图',
      style: 'japanese',
      aspectRatio: sceneGenOptions.ratio,
      customPrompt: finalPrompt,
      referenceImages: collectCurrentSceneReferences(),
    })

    currentScene.value.imageUrl = response.imageUrl
    currentScene.value.description = basePrompt
    const source = response.modelUsed || 'unknown'
    ElMessage.success(sceneDrawMode.value === 'dialog' ? `对话作图完成（来源：${source}）` : `场景图生成成功（来源：${source}）`)
  } catch (error: any) {
    ElMessage.error(error?.message || '生成失败，请稍后重试')
  } finally {
    generatingBackgrounds.value.delete(id)
  }
}

function switchSceneDrawMode(mode: 'prompt' | 'dialog') {
  sceneDrawMode.value = mode
  if (mode === 'dialog') {
    scenePromptDraft.value = scenePromptDraft.value.trim() || currentScene.value?.description || ''
    ElMessage.info('已复制当前提示词，可直接对话作图')
  }
}

function runDialogueDraw() {
  switchSceneDrawMode('dialog')
  void generateCurrentScene()
}

function collectCurrentSceneReferences() {
  const refs = [...currentSceneRefs.value]
  if (currentScene.value?.imageUrl) refs.unshift(currentScene.value.imageUrl)
  return refs.filter(Boolean)
}

function togglePointEditMode() {
  if (!currentScene.value?.imageUrl) {
    ElMessage.warning('当前场景暂无图片，请先生成或上传')
    return
  }
  pointEditMode.value = !pointEditMode.value
  ElMessage.info(pointEditMode.value ? '请在主图上点击要修改的位置' : '已取消点选改图')
}

async function onMainPreviewClick(event: MouseEvent) {
  if (!pointEditMode.value || !currentScene.value?.imageUrl) return

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
  const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
  selectedPoint.value = { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
  pointEditMode.value = false

  await runPointEdit()
}

async function runPointEdit() {
  if (!currentScene.value || !selectedPoint.value) return

  const id = currentScene.value.id
  const prompt = (scenePromptDraft.value || currentScene.value.description || '').trim()
  if (!prompt) {
    ElMessage.warning('请先输入提示词')
    return
  }

  generatingBackgrounds.value.add(id)
  try {
    const pointHint = `点选改图：仅优化坐标(${selectedPoint.value.x}%, ${selectedPoint.value.y}%)附近区域细节，保持其余画面与构图一致。`
    const response = await aiService.generateSceneImage({
      description: currentScene.value.name || '场景图',
      style: 'japanese',
      aspectRatio: sceneGenOptions.ratio,
      customPrompt: `${prompt}\n${pointHint}`,
      referenceImages: collectCurrentSceneReferences(),
    })
    currentScene.value.imageUrl = response.imageUrl
    const source = response.modelUsed || 'unknown'
    ElMessage.success(`点选改图完成（来源：${source}）`)
  } catch (error: any) {
    ElMessage.error(error?.message || '点选改图失败')
  } finally {
    generatingBackgrounds.value.delete(id)
  }
}

async function enhanceCurrentScene() {
  if (!currentScene.value?.imageUrl) {
    ElMessage.warning('当前场景暂无图片，请先生成或上传')
    return
  }

  const id = currentScene.value.id
  const prompt = (scenePromptDraft.value || currentScene.value.description || '').trim() || currentScene.value.name
  generatingBackgrounds.value.add(id)
  try {
    const response = await aiService.generateSceneImage({
      description: currentScene.value.name || '场景图',
      style: 'japanese',
      aspectRatio: sceneGenOptions.ratio,
      customPrompt: `${prompt}\n高清增强：超清晰细节、纹理锐化、边缘干净、噪点更少、整体观感更通透。`,
      referenceImages: collectCurrentSceneReferences(),
    })
    currentScene.value.imageUrl = response.imageUrl
    const source = response.modelUsed || 'unknown'
    ElMessage.success(`变清晰完成（来源：${source}）`)
  } catch (error: any) {
    ElMessage.error(error?.message || '变清晰失败')
  } finally {
    generatingBackgrounds.value.delete(id)
  }
}

function triggerMainUpload() {
  activeRefIndex.value = null
  sceneUploadInput.value?.click()
}

function triggerRoleUpload() {
  roleUploadInput.value?.click()
}

function triggerRefUpload(index: number) {
  activeRefIndex.value = index
  sceneUploadInput.value?.click()
}

async function handleSceneUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!currentScene.value) {
    ElMessage.warning('请先选择场景')
    input.value = ''
    return
  }

  try {
    const uploaded = await assetService.uploadAsset(file)
    if (activeRefIndex.value === null) {
      currentScene.value.imageUrl = uploaded.contentUrl
      ElMessage.success('图片已上传并应用到当前场景')
    } else {
      const refs = currentSceneRefs.value.slice()
      refs[activeRefIndex.value] = uploaded.contentUrl
      sceneRefs.value[currentScene.value.id] = refs
      ElMessage.success('参考图上传成功')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '上传失败')
  } finally {
    activeRefIndex.value = null
    input.value = ''
  }
}

async function handleRoleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!editingForm.roleId) {
    ElMessage.warning('请先选择角色形态')
    input.value = ''
    return
  }

  try {
    const uploaded = await assetService.uploadAsset(file)
    if (editingForm.target === 'three') {
      editingForm.threeViewUrl = uploaded.contentUrl
    } else {
      editingForm.fullBodyUrl = uploaded.contentUrl
    }
    touchRoleFormMeta(editingForm.formId)
    await persistAssetsNow()
    ElMessage.success('图片已上传并应用到当前形态')
  } catch (error: any) {
    ElMessage.error(error?.message || '上传失败')
  } finally {
    input.value = ''
  }
}

async function openAssetImportDialog(target: 'scene' | 'role' = 'scene') {
  assetImportTarget.value = target
  showAssetImport.value = true
  if (assetLibraryImages.value.length > 0) return

  loadingAssetLibrary.value = true
  try {
    const allAssets = await assetService.listAssets()
    assetLibraryImages.value = allAssets.filter(item => item.mimeType.startsWith('image/'))
  } catch (error: any) {
    ElMessage.error(error?.message || '加载资产库失败')
  } finally {
    loadingAssetLibrary.value = false
  }
}

function openSceneAssetImportDialog() {
  void openAssetImportDialog('scene')
}

function selectRoleReplaceItem(itemId: string) {
  roleReplaceSelectionId.value = itemId
}

function openRoleReplaceDialog(roleId: string, formId: string, target: 'three' | 'full') {
  roleReplaceTarget.roleId = roleId
  roleReplaceTarget.formId = formId
  roleReplaceTarget.target = target
  roleReplaceRoleId.value = roleId
  roleReplaceSelectionId.value = ''
  showRoleReplaceDialog.value = true
}

function triggerRoleReplaceUpload() {
  roleReplaceUploadInput.value?.click()
}

async function handleRoleReplaceUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const uploaded = await assetService.uploadAsset(file)
    applyRoleReplaceUrl(uploaded.contentUrl)
    touchRoleFormMeta(roleReplaceTarget.formId)
    await persistAssetsNow()
    ElMessage.success('图片已上传并替换')
    showRoleReplaceDialog.value = false
  } catch (error: any) {
    ElMessage.error(error?.message || '上传失败')
  } finally {
    input.value = ''
  }
}

function applyRoleReplaceUrl(url: string) {
  const role = roles.value.find(item => item.id === roleReplaceTarget.roleId)
  if (!role) return
  const form = getRoleForms(role).find(item => item.id === roleReplaceTarget.formId)
  if (!form) return

  if (roleReplaceTarget.target === 'three') {
    form.threeViewUrl = url
  } else {
    form.fullBodyUrl = url
  }
  role.avatarUrl = form.fullBodyUrl || form.threeViewUrl || role.avatarUrl
}

async function confirmRoleReplace() {
  if (!roleReplaceSelectionId.value) return
  const selected = roleReplaceDisplayItems.value.find(item => item.id === roleReplaceSelectionId.value)
  if (!selected) {
    ElMessage.warning('未找到选中的图片')
    return
  }
  applyRoleReplaceUrl(selected.url)
  touchRoleFormMeta(roleReplaceTarget.formId)
  await persistAssetsNow()
  ElMessage.success('替换成功')
  showRoleReplaceDialog.value = false
}

async function applyAssetImportImage(url: string) {
  if (assetImportTarget.value === 'role') {
    if (!editingForm.roleId) {
      ElMessage.warning('请先选择角色形态')
      return
    }
    if (editingForm.target === 'three') {
      editingForm.threeViewUrl = url
    } else {
      editingForm.fullBodyUrl = url
    }
    touchRoleFormMeta(editingForm.formId)
    await persistAssetsNow()
    showAssetImport.value = false
    ElMessage.success('已导入到当前形态')
    return
  }

  if (!currentScene.value) {
    ElMessage.warning('请先选择场景')
    return
  }
  currentScene.value.imageUrl = url
  await persistAssetsNow()
  showAssetImport.value = false
  ElMessage.success('已导入到当前场景')
}

function addProp() {
  props.value.push({
    id: Date.now().toString(36),
    name: `道具 ${props.value.length + 1}`,
    description: '',
    imageUrl: '',
  })
}

function previewImage(url?: string) {
  if (!url) {
    ElMessage.warning('当前没有可预览的图片')
    return
  }
  previewUrl.value = url
  showPreview.value = true
}

function downloadImage(url?: string) {
  if (!url) {
    ElMessage.warning('当前没有可下载的图片')
    return
  }
  window.open(url, '_blank')
}

function openGenerateSettings() {
  ElMessage.info('生成设置功能建设中')
}

function openExtractDialog() {
  extractPreview.value = null
  extractMeta.modelUsed = ''
  extractMeta.fallbackUsed = false
  showExtractDialog.value = true
}

async function startExtractAssets() {
  const script = (projectStore.currentProject?.script || '').trim()
  if (!script) {
    ElMessage.warning('当前项目完整剧本为空，无法提取')
    return
  }

  isExtracting.value = true
  try {
    const result = await aiService.extractAssetsFromScript(script, {
      sceneAgent: extractAgents.sceneAgent,
      roleAgent: extractAgents.roleAgent,
      propAgent: extractAgents.propAgent,
    })
    extractPreview.value = result
    extractMeta.modelUsed = result.modelUsed || 'unknown'
    extractMeta.fallbackUsed = !!result.fallbackUsed
    const sourceLabel = extractMeta.fallbackUsed
      ? `兜底模板（${extractMeta.modelUsed}）`
      : `模型：${extractMeta.modelUsed}`
    ElMessage.success(`提取完成，请确认后写入（来源：${sourceLabel}）`)
  } catch (error: any) {
    console.error('提取失败:', error)
    ElMessage.error(error?.message || '提取失败，请稍后重试')
  } finally {
    isExtracting.value = false
  }
}

function normalizedName(value: string) {
  return (value || '').trim().toLowerCase()
}

function mergeRolesFromExtract(items: ExtractAssetsResult['roles']) {
  items.forEach((item) => {
    const name = item.name?.trim()
    if (!name) return
    const hit = roles.value.find((r) => normalizedName(r.name) === normalizedName(name))
    if (hit) {
      if (!hit.description?.trim() && item.description?.trim()) {
        hit.description = item.description.trim()
      }
      return
    }
    roles.value.push(normalizeRole({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: (item.description || '').trim(),
      avatarUrl: '',
    }))
  })
}

function mergeSceneBgsFromExtract(items: ExtractAssetsResult['scenes']) {
  items.forEach((item) => {
    const name = item.name?.trim()
    if (!name) return
    const hit = sceneBgs.value.find((s) => normalizedName(s.name) === normalizedName(name))
    if (hit) {
      if (!hit.description?.trim() && item.description?.trim()) {
        hit.description = item.description.trim()
      }
      return
    }
    sceneBgs.value.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: (item.description || '').trim(),
      imageUrl: '',
    })
  })
}

function mergePropsFromExtract(items: ExtractAssetsResult['props']) {
  items.forEach((item) => {
    const name = item.name?.trim()
    if (!name) return
    const hit = props.value.find((p) => normalizedName(p.name) === normalizedName(name))
    if (hit) {
      if (!hit.description?.trim() && item.description?.trim()) {
        hit.description = item.description.trim()
      }
      return
    }
    props.value.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: (item.description || '').trim(),
      imageUrl: '',
    })
  })
}

async function applyExtractResult() {
  if (!extractPreview.value) {
    ElMessage.warning('请先执行提取')
    return
  }

  isApplyingExtract.value = true
  try {
    mergeSceneBgsFromExtract(extractPreview.value.scenes)
    mergeRolesFromExtract(extractPreview.value.roles)
    mergePropsFromExtract(extractPreview.value.props)

    syncAssetsToStore()
    await projectStore.saveCurrentProject()

    ElMessage.success('提取结果已写入（已自动去重合并）')
    showExtractDialog.value = false
    extractPreview.value = null
  } catch (error: any) {
    console.error('写入提取结果失败:', error)
    ElMessage.error(error?.message || '写入失败，请稍后重试')
  } finally {
    isApplyingExtract.value = false
  }
}

function editRole(roleId: string) {
  const role = roles.value.find(r => r.id === roleId)
  if (!role) return
  editingRoleId.value = roleId
  newRole.name = role.name
  newRole.description = role.description
  showAddRole.value = true
}

function editRoleForm(roleId: string, formId: string) {
  const role = roles.value.find(r => r.id === roleId)
  if (!role) return
  const forms = getRoleForms(role)
  forms.forEach((item) => touchRoleFormMeta(item.id))
  const form = forms.find(item => item.id === formId)
  if (!form) return

  editingForm.roleId = role.id
  editingForm.formId = form.id
  editingForm.name = form.name || role.name || ''
  editingForm.description = form.description || ''
  editingForm.threeViewUrl = form.threeViewUrl || ''
  editingForm.fullBodyUrl = form.fullBodyUrl || ''
  editingForm.target = form.fullBodyUrl ? 'full' : 'three'
  roleEditMode.value = 'prompt'
  roleResultViewMode.value = 'list'
  rolePointEditMode.value = false
  roleEditPoint.value = null
  showEditForm.value = true
}

function closeEditRoleForm() {
  showEditForm.value = false
  editingForm.roleId = ''
  editingForm.formId = ''
  editingForm.name = ''
  editingForm.description = ''
  editingForm.threeViewUrl = ''
  editingForm.fullBodyUrl = ''
  editingForm.target = 'full'
  roleEditMode.value = 'prompt'
  roleResultViewMode.value = 'list'
  rolePointEditMode.value = false
  roleEditPoint.value = null
}

async function regenerateEditingForm() {
  if (!editingForm.roleId) return

  if (!editingForm.description.trim()) {
    ElMessage.warning('请先填写形态描述')
    return
  }

  if (!ensureThreeViewReferenceReady()) return

  generatingEditForm.value = true
  try {
    const roleName = editingForm.name || editingRole.value?.name || '角色形态'
    const threeViewConstraint = '三视图约束：角色设定图（character turnaround sheet），同时展示正面、侧面、背面，T-pose 或自然站姿，白底，构图完整，服饰与面部一致。'
    const threeViewStrictAddon = '严格模式：三个视角的人物比例、头身比、服饰纹理和配色完全一致；固定角色朝向为正/左侧/背，禁止夸张透视与额外构图元素。'
    const fullBodyConstraint = '全身照约束：完整全身单人立绘，白底，主体居中，清晰展示服饰细节。'
    const strongRefAddon = '强参考模式：严格对齐参考图的人脸结构、发型轮廓、发色、服饰结构、材质纹理、主色与辅色比例；禁止改脸、改发型、改服装款式，仅允许在姿态和镜头上做最小变化。'
    let mergedDescription = editingForm.description

    if (editingForm.target === 'three') {
      mergedDescription = `${mergedDescription}\n${threeViewConstraint}`
      if (strictThreeViewMode.value) {
        mergedDescription = `${mergedDescription}\n${threeViewStrictAddon}`
      }
    } else {
      mergedDescription = `${mergedDescription}\n${fullBodyConstraint}`
    }

    if (strongReferenceMode.value) {
      mergedDescription = `${mergedDescription}\n${strongRefAddon}`
    }

    if (roleEditMode.value === 'dialog') {
      mergedDescription = `${mergedDescription}\n对话作图模式：保持角色身份一致，强化神态与动作叙事。`
    }

    const response = await aiService.generateRoleImage(
      {
        id: editingForm.roleId,
        name: roleName,
        description: mergedDescription,
        avatarUrl: getEditingGenerationReference(),
      },
      'japanese',
    )
    const imageUrl = response.imageUrl
    if (editingForm.target === 'three') {
      editingForm.threeViewUrl = imageUrl
    } else {
      editingForm.fullBodyUrl = imageUrl
    }
    touchRoleFormMeta(editingForm.formId)
    await persistAssetsNow()
    const source = response.modelUsed || 'unknown'
    ElMessage.success(`形态图生成成功（来源：${source}）`)
  } catch (error: any) {
    console.error('生成形态图失败:', error)
    ElMessage.error(error?.message || '生成失败，请稍后重试')
  } finally {
    generatingEditForm.value = false
  }
}

function switchEditingDialogForm(formId: string) {
  if (!editingForm.roleId) return
  const role = roles.value.find(r => r.id === editingForm.roleId)
  if (!role) return
  const form = getRoleForms(role).find(item => item.id === formId)
  if (!form) return

  editingForm.formId = form.id
  editingForm.name = form.name || role.name || ''
  editingForm.description = form.description || ''
  editingForm.threeViewUrl = form.threeViewUrl || ''
  editingForm.fullBodyUrl = form.fullBodyUrl || ''
  editingForm.target = form.fullBodyUrl ? 'full' : 'three'
  rolePointEditMode.value = false
  roleEditPoint.value = null
}

function switchEditingDialogRole(roleId: string) {
  const role = roles.value.find(r => r.id === roleId)
  if (!role) return
  const forms = getRoleForms(role)
  if (forms.length === 0) return
  switchEditingDialogForm(forms[0].id)
}

function moveRoleSelection(delta: -1 | 1) {
  if (!editingForm.roleId || roles.value.length <= 1) return
  const index = roles.value.findIndex(r => r.id === editingForm.roleId)
  if (index < 0) return
  const next = (index + delta + roles.value.length) % roles.value.length
  switchEditingDialogRole(roles.value[next].id)
}

function onRoleDialogKeydown(event: KeyboardEvent) {
  if (!showEditForm.value) return
  const target = event.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    moveRoleSelection(-1)
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    moveRoleSelection(1)
  }
}

watch(showEditForm, (open) => {
  if (open) {
    window.addEventListener('keydown', onRoleDialogKeydown)
  } else {
    window.removeEventListener('keydown', onRoleDialogKeydown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onRoleDialogKeydown)
  if (rolePreviewAudio) {
    rolePreviewAudio.pause()
    rolePreviewAudio.src = ''
    rolePreviewAudio = null
  }
})

function scrollFilmstrip(kind: 'role', direction: -1 | 1) {
  if (kind !== 'role') return
  const target = roleStripRef.value
  if (!target) return
  target.scrollBy({ left: direction * 220, behavior: 'smooth' })
}

function runGenerateThreeView() {
  editingForm.target = 'three'
  roleEditMode.value = 'prompt'
  void regenerateEditingForm()
}

function runRoleDialogueDraw() {
  roleEditMode.value = 'dialog'
  void regenerateEditingForm()
}

function toggleRolePointEdit() {
  if (!currentEditingPreview.value) {
    ElMessage.warning('请先生成形态图')
    return
  }
  rolePointEditMode.value = !rolePointEditMode.value
  ElMessage.info(rolePointEditMode.value ? '请在预览图中点选要修改区域' : '已取消点选改图')
}

async function onRolePreviewClick(event: MouseEvent) {
  if (!rolePointEditMode.value || !currentEditingPreview.value) return

  if (!ensureThreeViewReferenceReady()) return

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
  const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
  roleEditPoint.value = { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
  rolePointEditMode.value = false

  generatingEditForm.value = true
  try {
    const roleName = editingForm.name || editingRole.value?.name || '角色形态'
    const pointHint = `点选改图：仅优化坐标(${roleEditPoint.value.x}%, ${roleEditPoint.value.y}%)附近区域，保持角色主体与服饰一致。`
    const strongRefAddon = strongReferenceMode.value
      ? '\n强参考模式：保持参考图的人脸、发型、服饰和配色一致，仅对点选区域做细微修改。'
      : ''
    const response = await aiService.generateRoleImage(
      {
        id: editingForm.roleId,
        name: roleName,
        description: `${editingForm.description}\n${pointHint}${strongRefAddon}`,
        avatarUrl: getEditingGenerationReference(),
      },
      'japanese',
    )
    const imageUrl = response.imageUrl
    if (editingForm.target === 'three') {
      editingForm.threeViewUrl = imageUrl
    } else {
      editingForm.fullBodyUrl = imageUrl
    }
    touchRoleFormMeta(editingForm.formId)
    await persistAssetsNow()
    const source = response.modelUsed || 'unknown'
    ElMessage.success(`点选改图完成（来源：${source}）`)
  } catch (error: any) {
    ElMessage.error(error?.message || '点选改图失败')
  } finally {
    generatingEditForm.value = false
  }
}

async function enhanceRoleImage() {
  if (!editingForm.roleId) return
  if (!currentEditingPreview.value) {
    ElMessage.warning('请先生成形态图')
    return
  }

  if (!ensureThreeViewReferenceReady()) return

  generatingEditForm.value = true
  try {
    const roleName = editingForm.name || editingRole.value?.name || '角色形态'
    const strongRefAddon = strongReferenceMode.value
      ? '\n强参考模式：增强清晰度时保持参考图的人脸、发型、服饰版型与配色一致。'
      : ''
    const response = await aiService.generateRoleImage(
      {
        id: editingForm.roleId,
        name: roleName,
        description: `${editingForm.description}\n高清增强：细节更锐利，边缘更干净，材质层次更清晰。${strongRefAddon}`,
        avatarUrl: getEditingGenerationReference(),
      },
      'japanese',
    )
    const imageUrl = response.imageUrl
    if (editingForm.target === 'three') {
      editingForm.threeViewUrl = imageUrl
    } else {
      editingForm.fullBodyUrl = imageUrl
    }
    touchRoleFormMeta(editingForm.formId)
    await persistAssetsNow()
    const source = response.modelUsed || 'unknown'
    ElMessage.success(`变清晰完成（来源：${source}）`)
  } catch (error: any) {
    ElMessage.error(error?.message || '变清晰失败')
  } finally {
    generatingEditForm.value = false
  }
}

async function saveEditRoleForm() {
  if (!editingForm.roleId) return
  const role = roles.value.find(r => r.id === editingForm.roleId)
  if (!role) return
  const form = getRoleForms(role).find(item => item.id === editingForm.formId)
  if (!form) return

  form.name = editingForm.name.trim() || form.name
  form.description = editingForm.description
  form.threeViewUrl = editingForm.threeViewUrl
  form.fullBodyUrl = editingForm.fullBodyUrl
  touchRoleFormMeta(form.id)
  role.name = form.name || role.name
  role.description = form.description
  role.avatarUrl = form.fullBodyUrl || form.threeViewUrl || role.avatarUrl
  await persistAssetsNow()
  ElMessage.success('形态图已保存')
  closeEditRoleForm()
}

function copyRoleForm(roleId: string, formId: string) {
  const role = roles.value.find(r => r.id === roleId)
  if (!role) return
  const forms = getRoleForms(role)
  const source = forms.find(item => item.id === formId)
  if (!source) return

  const copied = {
    ...source,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${source.name || role.name} 副本`,
  }
  forms.push(copied)
  touchRoleFormMeta(copied.id)
  ElMessage.success('形态已复制')
}

function removeRoleForm(roleId: string, formId: string) {
  const role = roles.value.find(r => r.id === roleId)
  if (!role) return
  const forms = getRoleForms(role)
  if (forms.length <= 1) {
    ElMessage.warning('至少保留一个形态')
    return
  }

  role.roleForms = forms.filter(item => item.id !== formId)
  const primary = role.roleForms[0]
  if (primary) {
    role.name = primary.name || role.name
    role.description = primary.description
    role.avatarUrl = primary.fullBodyUrl || primary.threeViewUrl || role.avatarUrl
  }
  ElMessage.success('形态已删除')
}

function addRoleForm(roleId: string, sourceFormId?: string) {
  const role = roles.value.find(r => r.id === roleId)
  if (!role) return
  const forms = getRoleForms(role)
  const source = sourceFormId ? forms.find(item => item.id === sourceFormId) : undefined

  const appended = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: source?.name ? `${source.name} 新形态` : `${role.name} 新形态`,
    description: source?.description || role.description || '',
    threeViewUrl: source?.threeViewUrl || '',
    fullBodyUrl: source?.fullBodyUrl || '',
  }
  forms.push(appended)
  touchRoleFormMeta(appended.id)
  ElMessage.success('已新增形态')
}

function previewVoice(roleId: string) {
  void playRolePreview(roleId)
}

function isPreviewingRole(roleId: string) {
  return !!roleVoicePreviewing.value[roleId]
}

function resolveVoiceType(rawVoiceId?: string) {
  const value = (rawVoiceId || '').trim()
  if (!value) return 'youth'
  if ((supportedVoiceTypes as readonly string[]).includes(value)) return value

  const mapping: Record<string, string> = {
    '赤焰少侠': 'youth',
    '男声-沉稳': 'male-calm',
    '男声-热血': 'male-passionate',
    '女声-温柔': 'female-gentle',
    '女声-活泼': 'female-lively',
    '少年音': 'youth',
    '旁白-专业': 'narration-pro',
  }
  return mapping[value] || 'youth'
}

function buildRolePreviewText(role: Role) {
  const roleName = role.name?.trim() || '角色'
  const desc = role.description?.trim() || ''
  if (desc) {
    const shortDesc = desc.length > 90 ? `${desc.slice(0, 90)}...` : desc
    return `${roleName}，${shortDesc}`
  }
  return `${roleName}，你好，这是我的配音试听。`
}

async function playAudioUrl(url: string, roleId: string) {
  if (!rolePreviewAudio) {
    rolePreviewAudio = new Audio()
  }
  rolePreviewAudio.pause()
  rolePreviewAudio.src = url
  rolePreviewAudio.currentTime = 0
  activePreviewRoleId.value = roleId
  rolePreviewAudio.onended = () => {
    activePreviewRoleId.value = ''
  }
  await rolePreviewAudio.play()
}

async function playRolePreview(roleId: string) {
  const role = roles.value.find(item => item.id === roleId)
  if (!role) return

  roleVoicePreviewing.value[roleId] = true
  try {
    const voiceType = resolveVoiceType(role.voiceId)
    const cacheKey = `${roleId}:${voiceType}`
    const cachedUrl = roleVoicePreviewCache.value[cacheKey]

    if (cachedUrl) {
      await playAudioUrl(cachedUrl, roleId)
      return
    }

    const text = buildRolePreviewText(role)
    const result = await aiService.generateVoice(text, voiceType, `role-preview-${roleId}`)
    if (!result.audioUrl) {
      ElMessage.warning('试听生成失败，请稍后重试')
      return
    }

    roleVoicePreviewCache.value[cacheKey] = result.audioUrl
    await playAudioUrl(result.audioUrl, roleId)
    ElMessage.success(`正在试听：${role.name || '角色'}`)
  } catch (error: any) {
    ElMessage.error(error?.message || '试听失败，请稍后重试')
  } finally {
    roleVoicePreviewing.value[roleId] = false
  }
}

function openCardMenu() {
  ElMessage.info('更多操作建设中')
}

const currentEditingPreview = computed(() => {
  return editingForm.target === 'three' ? editingForm.threeViewUrl : editingForm.fullBodyUrl
})

const missingThreeViewReference = computed(() => {
  return editingForm.target === 'three' && !editingForm.fullBodyUrl
})

function getEditingGenerationReference() {
  if (editingForm.target === 'three') {
    return editingForm.fullBodyUrl || ''
  }
  return editingForm.fullBodyUrl || editingForm.threeViewUrl
}

function ensureThreeViewReferenceReady() {
  if (editingForm.target !== 'three') return true
  if (editingForm.fullBodyUrl) return true
  ElMessage.warning('生成三视图前，请先生成或上传全身照作为参考图')
  return false
}

const editingRole = computed(() => {
  if (!editingForm.roleId) return null
  return roles.value.find(r => r.id === editingForm.roleId) || null
})

const editingRoleForms = computed(() => {
  if (!editingRole.value) return []
  return getRoleForms(editingRole.value)
})

function touchRoleFormMeta(formId: string, model = sceneGenOptions.model) {
  if (!formId) return
  roleFormMeta.value[formId] = {
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    model,
  }
}

function getRoleFormModel(formId: string) {
  return roleFormMeta.value[formId]?.model || sceneGenOptions.model
}

function getRoleFormTime(formId: string) {
  return roleFormMeta.value[formId]?.updatedAt || '--'
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
.step-view {
  max-width: 1200px;
  color: #e6e6e6;
}

.step-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.step-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 6px;
}

.step-desc {
  font-size: 14px;
  color: #8b8b8b;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-ghost.accent {
  border-color: rgba(127, 224, 102, 0.4);
  color: #7fe066;
}

.asset-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  background: #1d1f20;
  border-radius: 12px;
  padding: 6px;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.tab-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #9a9a9a;
  font-size: 14px;
  cursor: pointer;
  transition: all var(--motion-standard);
  display: flex;
  align-items: center;
  gap: 8px;

  &.active {
    background: #2a3828;
    color: #84f06a;
    font-weight: 600;
  }

  &:hover:not(.active) {
    color: #eaeaea;
  }
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b3b3b;
  &.active { background: #65d657; }
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  font-size: 14px;
  color: #a0a0a0;
}

.empty-state {
  background: #1b1d1f;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  padding: 32px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty-icon { font-size: 32px; }
.empty-title { font-size: 16px; font-weight: 600; }
.empty-desc { font-size: 12px; color: #7a7a7a; }

.role-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.role-panel {
  background: #1f2329;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
}

.role-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.role-title {
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
  color: #f0f4f8;
}

.role-actions {
  display: flex;
  gap: 8px;
}

.role-form {
  background: #20252c;
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.form-title {
  font-weight: 600;
  font-size: 13px;
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-row {
  background: #1a1f24;
  padding: 8px 10px;
  border-radius: 10px;
}

.meta-item { font-size: 12px; color: #c2c2c2; }
.meta-label { color: #7a7a7a; margin-right: 6px; }

.voice-row {
  display: flex;
  align-items: center;
}

.voice-badge {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #dce3ea;
  border-radius: 999px;
  font-size: 12px;
  padding: 2px 10px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.image-card {
  background: #1a1f25;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #bcbcbc;
}

.image-body {
  aspect-ratio: 4 / 5;
  min-height: 180px;
  border-radius: 10px;
  background: #101112;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    background: #101112;
  }
}

.image-placeholder {
  color: #686868;
  font-size: 12px;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.add-form {
  width: 100%;
  background: #1a1f24;
  color: #7fe066;
  border: 1px dashed rgba(127, 224, 102, 0.45);
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 6px;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.asset-card {
  background: #1b1d1f;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.asset-thumb {
  width: 100%;
  height: 140px;
  border-radius: 10px;
  overflow: hidden;
  background: #101112;
  display: flex;
  align-items: center;
  justify-content: center;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.asset-placeholder {
  color: #6b6b6b;
  font-size: 12px;
}

.asset-info {
  h4 { font-size: 14px; font-weight: 600; color: #eaeaea; }
  p { font-size: 12px; color: #8a8a8a; margin-top: 4px; }
}

.asset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scene-workbench {
  display: grid;
  grid-template-columns: 44% 56%;
  gap: 14px;
}

.prompt-panel,
.result-panel {
  background: #1b1d1f;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 12px;
}

.prompt-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #17191a;
  border-radius: 12px;
  padding: 3px;
  margin-bottom: 10px;
}

.prompt-tab {
  border: none;
  background: transparent;
  color: #9ea3aa;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;

  &.active {
    background: #23272b;
    color: #7fe066;
    font-weight: 600;
  }
}

.scene-selector-row {
  background: #173826;
  border: 1px solid rgba(127, 224, 102, 0.3);
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.scene-badge {
  font-size: 13px;
  font-weight: 600;
  color: #b7f2ac;
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.ref-tile {
  height: 86px;
  background: #222529;
  border: 1px dashed rgba(255, 255, 255, 0.24);
  border-radius: 10px;
  color: #acb3bc;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.ref-plus {
  font-size: 28px;
  line-height: 1;
}

.prompt-area {
  margin-bottom: 10px;
}

.prompt-textarea {
  width: 100%;
  min-height: 260px;
  resize: vertical;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #17191a;
  color: #d7dbe0;
  padding: 12px;
  line-height: 1.65;
  outline: none;
}

.scene-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.btn-generate {
  width: 100%;
  font-weight: 700;
}

.result-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.view-switch,
.toolbar-right-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.result-headline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #9ea4ac;
  font-size: 12px;
}

.scene-line {
  color: #dfe4ea;
  font-weight: 600;
}

.result-main {
  display: grid;
  grid-template-columns: 1fr 74px;
  gap: 10px;
  margin-bottom: 10px;
}

.main-preview {
  position: relative;
  min-height: 320px;
  border-radius: 12px;
  overflow: hidden;
  background: #101112;
  border: 1px solid rgba(127, 224, 102, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &.picking {
    cursor: crosshair;
  }
}

.point-marker {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #7fe066;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.preview-actions {
  position: absolute;
  right: 8px;
  top: 8px;
  display: flex;
  gap: 6px;
}

.thumb-rail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}

.thumb-item {
  width: 66px;
  height: 66px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background: #202428;
  color: #8f98a2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;

  &.active {
    border-color: #7fe066;
    box-shadow: 0 0 0 1px rgba(127, 224, 102, 0.4);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.scene-result-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 8px;
  background: #17191a;
  cursor: pointer;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.import-grid {
  min-height: 280px;
  max-height: 420px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.import-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: #16181a;
  color: #d2d8df;
  font-size: 12px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;

  img {
    width: 100%;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
  }
}

.file-input {
  display: none;
}

.btn-mini {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(19, 21, 22, 0.8);
  color: #d7dce2;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
}

.preview-body {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #101112;
  border-radius: 12px;
  padding: 16px;

  img {
    max-width: 100%;
    max-height: 420px;
    object-fit: contain;
  }
}

.preview-empty {
  color: #6b6b6b;
  font-size: 12px;
}

.extract-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.extract-subtitle {
  font-size: 13px;
  color: #9ea3aa;
}

.extract-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #9ea3aa;
}

.extract-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #1a1c1e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
}

.extract-label {
  font-size: 14px;
  font-weight: 600;
  color: #dfe2e6;
}

.extract-preview {
  margin-top: 4px;
  border: 1px solid rgba(127, 224, 102, 0.28);
  border-radius: 12px;
  background: rgba(78, 111, 66, 0.1);
  padding: 12px;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #aee99f;
  margin-bottom: 8px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.preview-col {
  background: #17191a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 10px;
  min-height: 160px;

  ul {
    margin: 0;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow: auto;
  }

  li {
    font-size: 12px;
    color: #cfd3d8;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  strong {
    color: #f2f4f6;
    font-weight: 600;
  }

  span {
    color: #8c949b;
  }
}

.preview-head {
  font-size: 12px;
  font-weight: 700;
  color: #d7dde3;
  margin-bottom: 8px;
}

.btn-xs { padding: 4px 8px; font-size: 11px; }
.btn-sm { padding: 6px 12px; font-size: 12px; }

.danger { color: #F44336 !important; border-color: rgba(244, 67, 54, 0.3) !important; }

.dialog-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 13px; font-weight: 600; color: #ccc; }

.edit-form-dialog {
  display: grid;
  grid-template-columns: 0.92fr 1.28fr;
  gap: 14px;
}

.edit-form-dialog.ref-layout {
  min-height: 560px;
}

.dialog-filmstrip {
  display: block;
  margin-bottom: 8px;
}

.filmstrip-scroll {
  display: flex;
  gap: 8px;
  overflow: auto;
  padding-bottom: 2px;
}

.filmstrip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.filmstrip-title {
  font-size: 12px;
  color: #9ca5b0;
}

.filmstrip-nav {
  display: flex;
  gap: 6px;
}

.film-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #191b1d;
  color: #d2d9e2;
  cursor: pointer;
}

.film-nav-btn:hover {
  border-color: rgba(127, 224, 102, 0.6);
  color: #7fe066;
}

.role-strip {
  margin-bottom: 6px;
}

.form-strip {
  margin-bottom: 12px;
}

.film-item {
  min-width: 120px;
  max-width: 120px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: #191b1d;
  color: #cdd4dd;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;

  &.active {
    border-color: #7fe066;
    box-shadow: 0 0 0 1px rgba(127, 224, 102, 0.4);
    animation: roleActiveGlow 1.8s ease-in-out infinite;
  }

}

.film-thumb {
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 6px;
  overflow: hidden;
  background: #101112;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    background: #101112;
  }
}

.film-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6f7780;
  font-size: 11px;
}

.role-film {
  min-width: 96px;
  max-width: 96px;

  .film-name {
    text-align: center;
  }
}

@keyframes roleActiveGlow {
  0% {
    box-shadow: 0 0 0 1px rgba(127, 224, 102, 0.32);
  }
  50% {
    box-shadow: 0 0 0 1px rgba(127, 224, 102, 0.65), 0 0 14px rgba(127, 224, 102, 0.24);
  }
  100% {
    box-shadow: 0 0 0 1px rgba(127, 224, 102, 0.32);
  }
}

.film-name {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #17191a;
  border-radius: 12px;
  padding: 3px;
  margin-bottom: 10px;
}

.role-target-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.role-target-tabs .btn-ghost.required {
  border-color: rgba(244, 67, 54, 0.45);
}

.required-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f44336;
  margin-left: 6px;
  vertical-align: middle;
}

.required-text {
  margin-left: 4px;
  font-size: 11px;
  color: #ff8a80;
}

.role-ref-tip {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #f0ece2;
  color: #2f2c26;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.tip-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
}

.tip-sub {
  font-size: 12px;
  opacity: 0.8;
}

.edit-form-left,
.edit-form-right {
  background: #181a1d;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
}

.edit-form-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-form-right {
  display: flex;
  flex-direction: column;
}

.edit-left-preview {
  position: relative;
  min-height: 180px;
  border-radius: 12px;
  overflow: hidden;
  background: #0f1012;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.left-corner-actions {
  top: 10px;
  right: 10px;
}

.preview-card-title {
  font-size: 13px;
  color: #bcbcbc;
  margin-bottom: 0;
}

.role-actions-2 {
  margin-top: 10px;
  flex-wrap: wrap;
}

.role-result-list {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: #141618;
  overflow: hidden;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}

.result-row-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.result-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(127, 224, 102, 0.14);
  color: #b8f3ad;
}

.result-name {
  font-size: 12px;
  color: #e5e9ef;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-row-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #8e97a2;
  flex-shrink: 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.edit-preview-box {
  position: relative;
  min-height: 280px;
  background: #101112;
  border-radius: 12px;
  border: 1px solid rgba(127, 224, 102, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &.picking {
    cursor: crosshair;
  }
}

.edit-form-dialog .btn-generate {
  margin-top: auto;
}

.replace-source-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 6px;
  border-radius: 999px;
  background: #1a1e22;
  border: 1px solid rgba(255, 255, 255, 0.08);
  width: 340px;
  margin: 0 auto 14px;
}

.replace-source-tabs.single {
  width: 200px;
}

.source-tab {
  min-width: 146px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: #ced6e0;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &.active {
    background: #7fe066;
    color: #1b2a10;
  }
}

.replace-role-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.role-chip {
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: #161a1d;
  color: #d4dbe4;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &.active {
    border-color: rgba(127, 224, 102, 0.7);
    color: #7fe066;
    background: rgba(127, 224, 102, 0.12);
  }
}

.replace-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  min-height: 240px;
  max-height: 460px;
  overflow: auto;
  padding-right: 2px;
}

.replace-item {
  position: relative;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #161a1d;
  padding: 0;
  overflow: hidden;
  cursor: pointer;

  img {
    width: 100%;
    height: 160px;
    object-fit: cover;
    display: block;
  }

  &.active {
    border-color: rgba(127, 224, 102, 0.9);
    box-shadow: 0 0 0 1px rgba(127, 224, 102, 0.45);
  }
}

.replace-time {
  display: block;
  padding: 10px;
  font-size: 12px;
  color: #a5afbb;
  text-align: left;
}

.replace-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.replace-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #8f98a4;
  font-size: 14px;
  padding: 36px 12px;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 12px;
}

.step-actions {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
}

@media (max-width: 1024px) {
  .scene-workbench {
    grid-template-columns: 1fr;
  }

  .result-main {
    grid-template-columns: 1fr;
  }

  .thumb-rail {
    flex-direction: row;
    max-height: none;
  }

  .result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .film-item {
    min-width: 96px;
    max-width: 96px;
  }

  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
