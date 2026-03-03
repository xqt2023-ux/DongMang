<template>
  <header class="app-header">
    <div class="header-inner">
      <router-link to="/" class="logo">
        <span class="logo-icon">🎬</span>
        <span class="logo-text">动漫工坊</span>
      </router-link>

      <nav class="nav-tabs">
        <router-link to="/gallery" class="nav-tab" :class="{ active: $route.path === '/gallery' }">
          <span class="tab-icon">◇</span>
          案例广场
        </router-link>
        <router-link to="/my-works" class="nav-tab" :class="{ active: $route.path === '/my-works' }">
          <span class="tab-icon">📄</span>
          我的作品
        </router-link>
        <router-link to="/assets" class="nav-tab" :class="{ active: $route.path === '/assets' }">
          <span class="tab-icon">🗂</span>
          资产库
        </router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  height: 56px;
  background: #0a0a0a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 32px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  font-size: 18px;
  font-weight: 700;
  color: #eaeaea;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 22px;
}

.nav-tabs {
  display: flex;
  gap: 6px;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: #999;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  transition: all var(--motion-standard);

  .tab-icon {
    font-size: 14px;
  }

  &:hover {
    color: #eaeaea;
    background: rgba(255, 255, 255, 0.04);
  }

  &.active,
  &.router-link-active {
    color: #4CAF50;
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.08);
    font-weight: 600;
  }
}
</style>
