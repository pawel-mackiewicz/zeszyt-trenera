<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppIcon from '@/ui/components/AppIcon.vue'
import { resolveShellRouteTitle } from '@/ui/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import LeaveDemoButton from '@/ui/features/demo/LeaveDemoButton.vue'
import type { AppRouteName } from '@/ui/router'
import { useRoute, useRouter } from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'
import { useShellStore } from '@/ui/stores/shell.store'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const shellStore = useShellStore()
const { isOnline } = storeToRefs(appStore)
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})

const currentRouteName = computed(() => {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
})
const title = computed(() =>
  resolveShellRouteTitle({
    routeName: currentRouteName.value,
    fallbackTitle: t('app.name'),
    translate: t
  })
)
const backButtonLabel = computed(() => t('header.back'))
const menuButtonLabel = computed(() => t('header.menu'))
const offlineLabel = computed(() => t('network.offline'))
const showBack = computed(() => Boolean(route.meta.showBack))
const showOfflineBadge = computed(() => !isOnline.value)

function handleBack() {
  const backTo =
    typeof route.meta.backTo === 'string'
      ? resolveBackTarget(route.meta.backTo)
      : null

  if (backTo) {
    router.push(backTo)
    return
  }

  router.back()
}

function resolveBackTarget(backTo: string): string | null {
  let hasMissingParam = false

  const resolvedBackTo = backTo.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    const param = route.params[key]
    const value = Array.isArray(param) ? param[0] : param

    if (!value) {
      hasMissingParam = true
      return ''
    }

    return encodeURIComponent(String(value))
  })

  return hasMissingParam ? null : resolvedBackTo
}

function handleToggleSidebar() {
  shellStore.toggleSidebar()
}
</script>

<template>
  <header class="app-shell-header">
    <div class="app-shell-header__leading">
      <button
        v-if="showBack"
        class="app-shell-header__icon-button"
        data-testid="shell-back-button"
        type="button"
        :aria-label="backButtonLabel"
        @click="handleBack"
      >
        <AppIcon name="arrow_back" />
      </button>
      <button
        v-else
        class="app-shell-header__icon-button"
        data-testid="shell-menu-button"
        type="button"
        :aria-label="menuButtonLabel"
        @click="handleToggleSidebar"
      >
        <AppIcon name="menu" />
      </button>
      <h1 class="app-shell-header__title">
        {{ title }}
      </h1>
    </div>
    <div class="app-shell-header__actions">
      <LeaveDemoButton />
      <span v-if="showOfflineBadge" class="app-shell-header__offline-badge">{{
        offlineLabel
      }}</span>
    </div>
  </header>
</template>

<style scoped>
.app-shell-header {
  position: fixed;
  inset-inline: 0;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 4rem;
  padding-inline: 1.5rem;
  border-bottom: 1px solid rgb(from var(--color-on-surface) r g b / 0.1);
  background: rgb(from var(--color-surface) r g b / 0.9);
  backdrop-filter: blur(12px);
  transition: background-color 75ms ease;
}

.app-shell-header__leading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 1rem;
}

.app-shell-header__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 999px;
  color: var(--color-on-surface);
  transition:
    transform 75ms ease,
    background-color 75ms ease;
}

.app-shell-header__icon-button:hover,
.app-shell-header__icon-button:focus-visible {
  background: var(--color-surface-container-low);
}

.app-shell-header__icon-button:active {
  transform: scale(0.95);
}

.app-shell-header__icon-button:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: 3px;
}

.app-shell-header__title {
  min-width: 0;
  margin: 0;
  color: var(--color-primary);
  font-family: var(--font-headline);
  font-size: clamp(1.1rem, 3.5vw, 1.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.app-shell-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.app-shell-header__offline-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgb(from var(--color-danger) r g b / 0.25);
  background: rgb(from var(--color-danger) r g b / 0.1);
  padding: 0.25rem 0.625rem;
  color: var(--color-danger);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
}
</style>
