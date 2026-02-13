<template>
  <aside class="workflow-sidebar">
    <div class="sidebar-steps">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        class="step-item"
        :class="{
          active: currentStep === index + 1,
          completed: index + 1 < currentStep,
        }"
        @click="goToStep(step.key)"
      >
        <div class="step-connector" v-if="index > 0">
          <div class="connector-line" :class="{ filled: index + 1 <= currentStep }"></div>
        </div>
        <div class="step-indicator">
          <span class="step-number">{{ index + 1 }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { WORKFLOW_STEPS } from '@/types'

const route = useRoute()
const router = useRouter()

const steps = WORKFLOW_STEPS

const currentStep = computed(() => {
  return (route.meta?.step as number) || 1
})

function goToStep(stepKey: string) {
  const projectId = route.params.id as string
  if (projectId) {
    router.push(`/editor/${projectId}/${stepKey}`)
  }
}
</script>

<style scoped lang="scss">
.workflow-sidebar {
  width: 160px;
  min-width: 160px;
  background: #111111;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
}

.sidebar-steps {
  display: flex;
  flex-direction: column;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    .step-label {
      color: #eaeaea;
    }
  }

  &.active {
    .step-indicator {
      background: #4CAF50;
      border-color: #4CAF50;
      box-shadow: 0 0 12px rgba(76, 175, 80, 0.4);
    }
    .step-number {
      color: white;
    }
    .step-label {
      color: #eaeaea;
      font-weight: 600;
    }
  }

  &.completed {
    .step-indicator {
      background: rgba(76, 175, 80, 0.2);
      border-color: #4CAF50;
    }
    .step-number {
      color: #4CAF50;
    }
    .step-label {
      color: #999999;
    }
    .connector-line.filled {
      background: #4CAF50;
    }
  }
}

.step-connector {
  position: absolute;
  top: -12px;
  left: 22px;
  height: 14px;
  width: 2px;
}

.connector-line {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.3s ease;
}

.step-indicator {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.step-number {
  font-size: 12px;
  font-weight: 700;
  color: #666666;
  transition: color 0.3s ease;
}

.step-label {
  font-size: 13px;
  color: #666666;
  white-space: nowrap;
  transition: all 0.2s ease;
}
</style>
