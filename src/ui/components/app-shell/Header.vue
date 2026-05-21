<script setup lang="ts">
import AppIcon from '@/ui/components/AppIcon.vue'
import LeaveDemoButton from '@/ui/features/demo/LeaveDemoButton.vue'
import { useHeader } from './useHeader'

const {
  backButtonLabel,
  menuButtonLabel,
  offlineLabel,
  showBack,
  showOfflineBadge,
  title,
  handleBack,
  handleToggleDrawer
} = useHeader()
</script>

<template>
  <!-- What: keep the shell header as the visible mobile-first chrome. Why: route, network, and drawer decisions now live in useHeader after merging the manager into this component. -->
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
        @click="handleToggleDrawer"
      >
        <AppIcon name="menu" />
      </button>
      <h1 class="app-shell-header__title">
        {{ title }}
      </h1>
    </div>
    <div class="app-shell-header__actions">
      <!-- What: render the demo exit CTA as a header action. Why: the merged header owns its chrome while demo modal state stays behind the dedicated feature store. -->
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
