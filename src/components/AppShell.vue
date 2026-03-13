<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import BrandMark from '@/components/BrandMark.vue'
import { useAppUpdate } from '@/composables/useAppUpdate'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { navigationItems } from '@/router'
import { RouterLink, RouterView, useRoute } from '@/router/runtime'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()

useNetworkStatus()
const { promptInstall } = usePwaInstall()
const { refreshApplication } = useAppUpdate()

const {
  canInstall,
  dbConnected,
  installed,
  installPending,
  isOnline,
  needRefresh,
  offlineReady,
  shellTone,
  swRegistered,
  updatePending
} = storeToRefs(appStore)

const summary = computed(() => route.meta.summary)
const title = computed(() => route.meta.title)
const eyebrow = computed(() => route.meta.eyebrow)

const shellStateLabel = computed(() => {
  if (needRefresh.value) {
    return 'Update waiting'
  }

  return isOnline.value ? 'Connected' : 'Offline'
})

async function installApp() {
  await promptInstall()
}

async function applyUpdate() {
  await refreshApplication()
}
</script>

<template>
  <div class="shell" :data-tone="shellTone">
    <div class="shell__frame">
      <header class="shell__masthead">
        <div class="shell__brand">
          <BrandMark />
          <div>
            <p class="shell__eyebrow">{{ eyebrow }}</p>
            <h1 class="shell__title">{{ title }}</h1>
          </div>
        </div>

        <div class="shell__badges" aria-label="Application status">
          <span class="shell__chip" :class="`shell__chip--${shellTone}`">{{ shellStateLabel }}</span>
          <span v-if="swRegistered" class="shell__chip shell__chip--neutral">SW active</span>
          <span v-if="dbConnected" class="shell__chip shell__chip--neutral">Dexie wired</span>
        </div>

        <p class="shell__summary">
          {{ summary }}
        </p>

        <div class="shell__actions">
          <button
            v-if="canInstall && !installed"
            class="shell__action shell__action--primary"
            type="button"
            :disabled="installPending"
            @click="installApp"
          >
            {{ installPending ? 'Preparing install…' : 'Install app' }}
          </button>
          <button
            v-if="needRefresh"
            class="shell__action shell__action--secondary"
            type="button"
            :disabled="updatePending"
            @click="applyUpdate"
          >
            {{ updatePending ? 'Refreshing…' : 'Update now' }}
          </button>
        </div>
      </header>

      <div v-if="offlineReady && !needRefresh" class="shell__banner shell__banner--offline">
        <p>The shell is cached. After the first load, this app now boots offline.</p>
        <button type="button" class="shell__banner-action" @click="appStore.dismissOfflineReady()">
          Dismiss
        </button>
      </div>

      <div v-if="!isOnline" class="shell__banner shell__banner--network">
        <p>You are offline. Local data remains available; remote features can layer in later.</p>
      </div>

      <main class="shell__content">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>

      <nav class="shell__dock" aria-label="Primary">
        <RouterLink
          v-for="item in navigationItems"
          :key="item.name"
          :to="item.to"
          class="shell__nav-link"
          active-class="shell__nav-link--active"
        >
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  padding: 1.25rem;
}

.shell__frame {
  width: min(100%, 72rem);
  margin: 0 auto;
  min-height: calc(100vh - 2.5rem);
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 1rem;
}

.shell__masthead {
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  border: 1px solid rgba(16, 59, 55, 0.12);
  border-radius: 1.75rem;
  background:
    linear-gradient(145deg, rgba(255, 251, 243, 0.92), rgba(220, 230, 215, 0.78)),
    linear-gradient(135deg, rgba(16, 59, 55, 0.08), transparent 42%);
  box-shadow: var(--shadow-strong);
}

.shell__masthead::after {
  content: '';
  position: absolute;
  inset: auto -2rem -2.5rem auto;
  width: 11rem;
  height: 11rem;
  border-radius: 2rem;
  background: linear-gradient(145deg, rgba(77, 128, 146, 0.14), rgba(199, 106, 43, 0.2));
  transform: rotate(16deg);
}

.shell__brand,
.shell__badges,
.shell__summary,
.shell__actions {
  position: relative;
  z-index: 1;
}

.shell__brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.shell__eyebrow {
  margin: 0 0 0.25rem;
  color: var(--accent);
  font: 700 0.8rem/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.shell__title {
  margin: 0;
  font: 700 clamp(2rem, 6vw, 3.2rem) / 0.95 var(--font-display);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.shell__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.shell__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0 0.85rem;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: rgba(255, 255, 255, 0.6);
  color: var(--ink);
  font-size: 0.86rem;
  font-weight: 700;
}

.shell__chip--online {
  background: rgba(38, 127, 92, 0.12);
  color: var(--success);
}

.shell__chip--offline {
  background: rgba(161, 63, 48, 0.12);
  color: var(--danger);
}

.shell__chip--update {
  background: rgba(199, 106, 43, 0.14);
  color: var(--accent-hot);
}

.shell__chip--neutral {
  background: rgba(16, 59, 55, 0.08);
}

.shell__summary {
  max-width: 36rem;
  margin: 1rem 0 0;
  color: var(--ink-soft);
  line-height: 1.5;
}

.shell__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.shell__action,
.shell__banner-action {
  min-height: 2.9rem;
  padding: 0 1rem;
  border-radius: 1rem;
  font-weight: 700;
  transition:
    transform var(--speed-fast) var(--ease-standard),
    box-shadow var(--speed-fast) var(--ease-standard),
    background-color var(--speed-fast) var(--ease-standard);
}

.shell__action:hover,
.shell__banner-action:hover,
.shell__action:focus-visible,
.shell__banner-action:focus-visible {
  transform: translateY(-1px);
}

.shell__action:focus-visible,
.shell__banner-action:focus-visible,
.shell__nav-link:focus-visible {
  outline: 2px solid var(--accent-hot);
  outline-offset: 2px;
}

.shell__action:disabled {
  cursor: wait;
  opacity: 0.72;
}

.shell__action--primary {
  background: linear-gradient(135deg, var(--accent-strong), var(--accent));
  color: #f6f1e5;
  box-shadow: 0 10px 24px rgba(16, 59, 55, 0.22);
}

.shell__action--secondary,
.shell__banner-action {
  background: rgba(255, 255, 255, 0.8);
  color: var(--ink);
  border: 1px solid rgba(16, 59, 55, 0.12);
}

.shell__banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 1.15rem;
  border: 1px solid rgba(16, 59, 55, 0.12);
  box-shadow: var(--shadow-soft);
}

.shell__banner p {
  margin: 0;
  line-height: 1.4;
}

.shell__banner--offline {
  background: rgba(38, 127, 92, 0.12);
}

.shell__banner--network {
  background: rgba(161, 63, 48, 0.11);
}

.shell__content {
  min-height: 0;
}

.shell__dock {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  padding: 0.75rem;
  border-radius: 1.5rem;
  background: rgba(16, 59, 55, 0.92);
  box-shadow: var(--shadow-soft);
}

.shell__nav-link {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 3rem;
  padding: 0 0.75rem;
  border-radius: 1rem;
  color: rgba(245, 239, 223, 0.72);
  font: 700 0.95rem/1 var(--font-display);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition:
    background-color var(--speed-fast) var(--ease-standard),
    color var(--speed-fast) var(--ease-standard),
    transform var(--speed-fast) var(--ease-standard);
}

.shell__nav-link:hover,
.shell__nav-link:focus-visible {
  color: #f5efdf;
  transform: translateY(-1px);
}

.shell__nav-link--active {
  background: linear-gradient(135deg, rgba(199, 106, 43, 0.92), rgba(15, 107, 87, 0.92));
  color: #fff5ea;
}

@media (min-width: 760px) {
  .shell {
    padding: 1.75rem;
  }

  .shell__frame {
    min-height: calc(100vh - 3.5rem);
    gap: 1.25rem;
  }

  .shell__masthead {
    padding: 2rem;
  }

  .shell__dock {
    grid-template-columns: repeat(3, max-content);
    justify-content: center;
  }
}

@media (max-width: 540px) {
  .shell {
    padding: 0.85rem;
  }

  .shell__frame {
    min-height: calc(100vh - 1.7rem);
  }

  .shell__masthead {
    padding: 1.2rem;
    border-radius: 1.35rem;
  }

  .shell__banner {
    align-items: flex-start;
    flex-direction: column;
  }

  .shell__actions {
    flex-direction: column;
  }

  .shell__action,
  .shell__banner-action {
    width: 100%;
  }
}
</style>
