<template>
  <div class="gallery-page">
    <div class="gallery-header">
      <h1>案例广场</h1>
      <p class="sub">发现精彩 AI 动漫创作</p>
    </div>

    <div class="gallery-toolbar">
      <div class="filter-tags">
        <span
          class="tag"
          :class="{ active: activeTag === tag }"
          v-for="tag in tags"
          :key="tag"
          @click="activeTag = tag"
        >{{ tag }}</span>
      </div>
      <div class="sort-select">
        <select v-model="sortBy">
          <option value="latest">最新发布</option>
          <option value="popular">最受欢迎</option>
        </select>
      </div>
    </div>

    <div class="gallery-grid">
      <div
        class="gallery-card"
        v-for="work in filteredWorks"
        :key="work.id"
        @click="openDetail(work)"
      >
        <div class="card-cover">
          <img :src="work.coverUrl" :alt="work.title" />
          <div class="hover-overlay">
            <span class="play-btn">▶</span>
          </div>
          <span class="card-type">{{ work.storyType }}</span>
        </div>
        <div class="card-body">
          <h3>{{ work.title }}</h3>
          <p class="card-summary">{{ work.summary }}</p>
          <div class="card-footer">
            <div class="author">
              <img :src="work.authorAvatar" class="avatar" />
              <span>{{ work.authorName }}</span>
            </div>
            <span class="score">🔥 {{ work.score }}</span>
          </div>
        </div>
      </div>
    </div>

    <p class="no-more" v-if="filteredWorks.length">没有更多了</p>
    <p class="empty" v-else>暂无作品</p>

    <WorkDetailModal
      v-if="selectedWork"
      :visible="showDetail"
      :work="selectedWork"
      @close="showDetail = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import WorkDetailModal from '@/components/common/WorkDetailModal.vue'
import type { PublishedWork } from '@/types'

const activeTag = ref('全部')
const sortBy = ref('latest')
const showDetail = ref(false)
const selectedWork = ref<PublishedWork | null>(null)

const tags = ['全部', '悬疑推理', '古代传奇', '科幻机甲', '奇幻仙侠', '恐怖惊悚', '都市情感']

function openDetail(work: PublishedWork) {
  selectedWork.value = work
  showDetail.value = true
}

// 示例数据
const works = ref<PublishedWork[]>([
  {
    id: '1', title: '霍去病', summary: '公元前 119 年，21 岁霍去病领五万大汉铁骑，深入漠北两千里大破七万匈奴。',
    storyType: '古代英雄传奇', coverUrl: 'https://picsum.photos/seed/g1/400/300',
    videoUrl: '', shareToken: 'abc', authorName: '创作者A', authorAvatar: 'https://picsum.photos/seed/ga1/48/48',
    roles: [], score: 220, createdAt: '2026-02-04T16:23:47+08:00', updatedAt: '2026-02-04T19:11:52+08:00',
  },
  {
    id: '2', title: '循环终章', summary: '少数人会被困在自己死亡的当天无限重置。',
    storyType: '悬疑推理', coverUrl: 'https://picsum.photos/seed/g2/400/300',
    videoUrl: '', shareToken: 'def', authorName: '创作者B', authorAvatar: 'https://picsum.photos/seed/ga2/48/48',
    roles: [], score: 170, createdAt: '2026-02-04T16:23:48+08:00', updatedAt: '2026-02-04T18:53:31+08:00',
  },
  {
    id: '3', title: '星际机甲', summary: '末日东京废墟中，少年驾驶员驾驶钢魂号，与外星寄生体进行激战。',
    storyType: '科幻机甲', coverUrl: 'https://picsum.photos/seed/g3/400/300',
    videoUrl: '', shareToken: 'ghi', authorName: '创作者C', authorAvatar: 'https://picsum.photos/seed/ga3/48/48',
    roles: [], score: 190, createdAt: '2026-02-04T16:23:48+08:00', updatedAt: '2026-02-04T19:15:52+08:00',
  },
  {
    id: '4', title: '绘魂师', summary: '新国风暗黑奇幻背景下，绘魂师沈离在绘魂阁遭遇恶霸赵公子威逼作画。',
    storyType: '奇幻仙侠', coverUrl: 'https://picsum.photos/seed/g4/400/300',
    videoUrl: '', shareToken: 'jkl', authorName: '创作者D', authorAvatar: 'https://picsum.photos/seed/ga4/48/48',
    roles: [], score: 200, createdAt: '2026-02-04T16:23:47+08:00', updatedAt: '2026-02-04T17:21:02+08:00',
  },
  {
    id: '5', title: '天花板的危险', summary: '在深夜的洗衣房，一名女孩在音乐中沉浸，未察觉天花板上的恐怖怪物悄然逼近。',
    storyType: '恐怖惊悚', coverUrl: 'https://picsum.photos/seed/g5/400/300',
    videoUrl: '', shareToken: 'mno', authorName: '创作者E', authorAvatar: 'https://picsum.photos/seed/ga5/48/48',
    roles: [], score: 160, createdAt: '2026-02-04T18:13:55+08:00', updatedAt: '2026-02-04T18:16:12+08:00',
  },
  {
    id: '6', title: '寻仙之路', summary: '东荒边陲的普通采药少年韦毅，在断崖采摘紫灵参时意外坠崖。',
    storyType: '奇幻仙侠', coverUrl: 'https://picsum.photos/seed/g6/400/300',
    videoUrl: '', shareToken: 'pqr', authorName: '创作者F', authorAvatar: 'https://picsum.photos/seed/ga6/48/48',
    roles: [], score: 130, createdAt: '2026-02-04T16:23:47+08:00', updatedAt: '2026-02-04T19:12:35+08:00',
  },
])

const filteredWorks = computed(() => {
  let list = works.value
  if (activeTag.value !== '全部') {
    list = list.filter(w => w.storyType.includes(activeTag.value))
  }
  return sortBy.value === 'popular'
    ? [...list].sort((a, b) => b.score - a.score)
    : [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})
</script>

<style scoped lang="scss">
.gallery-page {
  min-height: 100%;
  overflow-y: auto;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.gallery-header {
  margin-bottom: 24px;
  h1 { font-size: 28px; font-weight: 700; color: #eaeaea; }
  .sub { font-size: 14px; color: #888; margin-top: 6px; }
}

.gallery-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  color: #aaa;
  cursor: pointer;
  background: #1a1a1a;
  border: 1px solid transparent;
  transition: all var(--motion-standard);

  &:hover { color: #eaeaea; }
  &.active {
    background: rgba(76, 175, 80, 0.15);
    color: #4CAF50;
    border-color: rgba(76, 175, 80, 0.3);
  }
}

.sort-select select {
  background: #1a1a1a;
  border: 1px solid #333;
  color: #ccc;
  padding: 6px 12px;
  border-radius: var(--radius-xs);
  font-size: 13px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.gallery-card {
  background: #1a1a1a;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all var(--motion-standard);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    .hover-overlay { opacity: 1; }
  }
}

.card-cover {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--motion-standard);
}

.play-btn {
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

.card-type {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #4CAF50;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: var(--radius-lg);
}

.card-body {
  padding: 14px 16px;

  h3 { font-size: 15px; font-weight: 600; color: #eaeaea; margin-bottom: 6px; }
}

.card-summary {
  font-size: 12px;
  color: #888;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;

  .avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
  }
}

.score {
  font-size: 12px;
  color: #ff9800;
}

.no-more, .empty {
  text-align: center;
  padding: 40px;
  font-size: 13px;
  color: #666;
}
</style>
