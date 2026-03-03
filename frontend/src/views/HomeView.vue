<template>
  <div class="home-page">
    <!-- Hero 区域 -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">三倍速出片，电影级质感</h1>
        <button class="btn-create" @click="startCreate">
          ✨ 我要创作 →
        </button>
      </div>
      <div class="hero-showcase">
        <img src="https://picsum.photos/seed/dongmang-hero/800/400" alt="showcase" class="showcase-img" />
      </div>
    </section>

    <!-- 用户作品 -->
    <section class="works-section">
      <h2 class="section-title">用户作品</h2>
      <div class="works-grid">
        <div
          class="work-card"
          v-for="work in publishedWorks"
          :key="work.id"
          @click="openWorkDetail(work)"
        >
          <div class="work-cover">
            <img :src="getWorkCover(work)" :alt="work.title" />
            <div class="play-overlay">
              <span class="play-icon">▶</span>
            </div>
          </div>
          <div class="work-info">
            <h3 class="work-title">{{ work.title }}</h3>
            <span class="work-action">查看作品</span>
          </div>
        </div>
      </div>
      <p class="no-more" v-if="publishedWorks.length > 0">没有更多内容了</p>
    </section>

    <!-- 作品详情弹窗 -->
    <WorkDetailModal
      :visible="showDetail"
      :work="selectedWork!"
      @close="showDetail = false"
      v-if="selectedWork"
    />

    <!-- Footer -->
    <footer class="site-footer">
      <a href="#">使用协议</a>
      <a href="#">隐私条款</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import WorkDetailModal from '@/components/common/WorkDetailModal.vue'
import type { PublishedWork } from '@/types'

const router = useRouter()
const showDetail = ref(false)
const selectedWork = ref<PublishedWork | null>(null)
const defaultWorkCover = 'https://picsum.photos/seed/default-cover/400/300'

function startCreate() {
  const newId = Date.now().toString(36)
  router.push(`/editor/${newId}/global-settings`)
}

function openWorkDetail(work: PublishedWork) {
  selectedWork.value = work
  showDetail.value = true
}

function getWorkCover(work: PublishedWork): string {
  if (work.coverUrl) return work.coverUrl
  const roleAvatar = work.roles.find(role => role.avatarUrl)?.avatarUrl
  return roleAvatar || defaultWorkCover
}

// 示例数据
const publishedWorks = ref<PublishedWork[]>([
  {
    id: '1', title: '霍去病', summary: '公元前 119 年，21 岁霍去病领五万大汉铁骑，深入漠北两千里大破七万匈奴。',
    storyType: '古代英雄传奇', coverUrl: 'https://picsum.photos/seed/hqb/400/300',
    videoUrl: '', shareToken: 'abc', authorName: '创作者A', authorAvatar: 'https://picsum.photos/seed/a1/48/48',
    roles: [{ id: '1', name: '霍去病', avatarUrl: 'https://picsum.photos/seed/r1/64/64' }],
    score: 220, createdAt: '2026-02-04T16:23:47+08:00', updatedAt: '2026-02-04T19:11:52+08:00',
  },
  {
    id: '2', title: '循环终章', summary: '少数人会被困在自己死亡的当天无限重置，林昼便是其一，他已在 6 月 17 日死亡 364 次。',
    storyType: '死亡重置', coverUrl: 'https://picsum.photos/seed/xhzz/400/300',
    videoUrl: '', shareToken: 'def', authorName: '创作者B', authorAvatar: 'https://picsum.photos/seed/a2/48/48',
    roles: [{ id: '1', name: '林昼', avatarUrl: 'https://picsum.photos/seed/r2/64/64' }],
    score: 170, createdAt: '2026-02-04T16:23:48+08:00', updatedAt: '2026-02-04T18:53:31+08:00',
  },
  {
    id: '3', title: '星际机甲：地球守望者', summary: '末日东京废墟中，少年驾驶员绫小路飒太驾驶钢魂号，与外星寄生体进行激战。',
    storyType: '外星寄生体', coverUrl: 'https://picsum.photos/seed/xjjj/400/300',
    videoUrl: '', shareToken: 'ghi', authorName: '创作者C', authorAvatar: 'https://picsum.photos/seed/a3/48/48',
    roles: [{ id: '1', name: '飒太', avatarUrl: 'https://picsum.photos/seed/r3/64/64' }],
    score: 190, createdAt: '2026-02-04T16:23:48+08:00', updatedAt: '2026-02-04T19:15:52+08:00',
  },
  {
    id: '4', title: '绘魂师', summary: '新国风暗黑奇幻背景下，绘魂师沈离在绘魂阁遭遇恶霸赵公子威逼作画。',
    storyType: '墨封恶业', coverUrl: 'https://picsum.photos/seed/hhs/400/300',
    videoUrl: '', shareToken: 'jkl', authorName: '创作者D', authorAvatar: 'https://picsum.photos/seed/a4/48/48',
    roles: [{ id: '1', name: '沈离', avatarUrl: 'https://picsum.photos/seed/r4/64/64' }],
    score: 200, createdAt: '2026-02-04T16:23:47+08:00', updatedAt: '2026-02-04T17:21:02+08:00',
  },
  {
    id: '5', title: '天花板的危险', summary: '在深夜的洗衣房，一名女孩在音乐中沉浸，未察觉天花板上的恐怖怪物悄然逼近。',
    storyType: '悬念恐怖', coverUrl: 'https://picsum.photos/seed/thb/400/300',
    videoUrl: '', shareToken: 'mno', authorName: '创作者E', authorAvatar: 'https://picsum.photos/seed/a5/48/48',
    roles: [], score: 160, createdAt: '2026-02-04T18:13:55+08:00', updatedAt: '2026-02-04T18:16:12+08:00',
  },
  {
    id: '6', title: '寻仙之路', summary: '东荒边陲的普通采药少年韦毅，在断崖采摘紫灵参时意外坠崖，崖底遭遇凶戾妖狼。',
    storyType: '仙魂觉醒', coverUrl: 'https://picsum.photos/seed/xxzl/400/300',
    videoUrl: '', shareToken: 'pqr', authorName: '创作者F', authorAvatar: 'https://picsum.photos/seed/a6/48/48',
    roles: [{ id: '1', name: '韦毅', avatarUrl: 'https://picsum.photos/seed/r5/64/64' }],
    score: 130, createdAt: '2026-02-04T16:23:47+08:00', updatedAt: '2026-02-04T19:12:35+08:00',
  },
])
</script>

<style scoped lang="scss">
.home-page {
  min-height: 100%;
  overflow-y: auto;
}

/* Hero */
.hero {
  padding: 48px 32px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.hero-title {
  font-size: 40px;
  font-weight: 800;
  color: #eaeaea;
  letter-spacing: 2px;
}

.btn-create {
  background: linear-gradient(135deg, #4CAF50, #81C784);
  border: none;
  color: white;
  padding: 14px 48px;
  border-radius: var(--radius-pill-lg);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--motion-standard);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4);
  }
}

.hero-showcase {
  width: 100%;
  max-width: 800px;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.showcase-img {
  width: 100%;
  display: block;
}

/* Works */
.works-section {
  padding: 32px 32px 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #eaeaea;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.work-card {
  background: #1a1a1a;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all var(--motion-standard);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    border-color: rgba(76, 175, 80, 0.2);

    .play-overlay { opacity: 1; }
  }
}

.work-cover {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--motion-standard);
}

.play-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #333;
  padding-left: 3px;
}

.work-info {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.work-title {
  font-size: 14px;
  font-weight: 600;
  color: #eaeaea;
}

.work-action {
  font-size: 12px;
  color: #4CAF50;
  white-space: nowrap;
}

.no-more {
  text-align: center;
  padding: 32px;
  font-size: 13px;
  color: #666;
}

/* Footer */
.site-footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  a {
    color: #666;
    text-decoration: none;
    font-size: 12px;
    &:hover { color: #999; }
  }
}
</style>
