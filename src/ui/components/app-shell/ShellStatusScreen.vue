<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import { APP_SHELL_MESSAGES } from '@/ui/components/app-shell/AppShell.messages'
import { useAppStore } from '@/ui/stores/app'

const appStore = useAppStore()
const { appReadiness, blockingIssue, setupStatus } = storeToRefs(appStore)
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})

const isSetupChecking = computed(
  () => appReadiness.value === 'ready' && setupStatus.value === 'checking'
)
const isBlockingApplication = computed(() => appReadiness.value === 'blocked')
const eyebrow = computed(() =>
  isBlockingApplication.value
    ? t('shellState.blocked.eyebrow')
    : isSetupChecking.value
      ? t('shellState.setupChecking.eyebrow')
      : t('shellState.checking.eyebrow')
)
const title = computed(() =>
  isBlockingApplication.value
    ? t('shellState.blocked.title')
    : isSetupChecking.value
      ? t('shellState.setupChecking.title')
      : t('shellState.checking.title')
)
const copy = computed(() => {
  if (isSetupChecking.value) {
    return t('shellState.setupChecking.body')
  }

  if (!isBlockingApplication.value) {
    return t('shellState.checking.body')
  }

  return blockingIssue.value === 'database'
    ? t('shellState.blocked.database')
    : t('shellState.blocked.unknown')
})

function reloadApplication() {
  // What: restart the whole shell from the blocking recovery CTA. Why: a cold boot is the safest local-first recovery path after startup state gets stuck or IndexedDB opens incorrectly.
  window.location.reload()
}
</script>

<template>
  <section class="min-h-screen px-6 py-12 flex items-center justify-center">
    <!-- What: keep boot, setup-checking, and blocked copy in one full-screen status surface. Why: AppShell should decide the current phase while this component owns the user-facing recovery and loading presentation. -->
    <div class="shell-status-card">
      <p class="shell-status-card__eyebrow">{{ eyebrow }}</p>
      <h1 class="shell-status-card__title">{{ title }}</h1>
      <p class="shell-status-card__copy">{{ copy }}</p>
      <div v-if="isBlockingApplication" class="flex flex-col sm:flex-row gap-3">
        <!-- What: route shell recovery through the shared button primitive. Why: startup recovery still needs the same tactile CTA feedback as the main views without duplicating button styling here. -->
        <AppButton type="button" @click="reloadApplication">
          {{ t('shellState.retry') }}
        </AppButton>
      </div>
      <div v-else class="shell-status-card__loading" aria-hidden="true">
        <span class="shell-status-card__loading-line"></span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.shell-status-card {
  width: min(100%, 34rem);
  display: grid;
  gap: 1rem;
  padding: clamp(1.5rem, 4vw, 2.25rem);
  border-radius: 1.75rem;
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: rgba(249, 249, 249, 0.96);
  box-shadow: var(--shadow-strong);
}

.shell-status-card__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-hot);
}

.shell-status-card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 7vw, 3rem);
  line-height: 0.98;
  text-transform: uppercase;
  color: var(--accent-strong);
}

.shell-status-card__copy {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.6;
}

.shell-status-card__loading {
  width: 100%;
  height: 0.35rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(16, 59, 55, 0.08);
}

.shell-status-card__loading-line {
  display: block;
  width: 35%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-cool), var(--accent));
  animation: shell-loading 1.4s ease-in-out infinite;
}

@keyframes shell-loading {
  0%,
  100% {
    transform: translateX(-10%);
  }

  50% {
    transform: translateX(190%);
  }
}
</style>
