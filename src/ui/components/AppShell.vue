<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import AppIcon from '@/ui/components/AppIcon.vue'
import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { createNavigationItems } from '@/ui/router'
import {
  RouterLink,
  RouterView,
  useRoute,
  useRouter
} from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

useNetworkStatus()
const { promptInstall, installInstructions } = usePwaInstall()
const { refreshApplication } = useAppUpdate()

const {
  appReadiness,
  blockingMessage,
  installCoachVisible,
  installed,
  installModalVisible,
  installPending,
  installSurface,
  isOnline,
  needRefresh,
  showInstallEntry,
  shouldAutoOpenInstallModal,
  updateError,
  updateModalVisible,
  updatePending
} = storeToRefs(appStore)

const title = computed(() => route.meta.title)
// Keeping menu entries derived from the router avoids shipping dead links in production builds.
const navigationItems = createNavigationItems()
const isMenuOpen = ref(false)

const isShellReady = computed(() => appReadiness.value === 'ready')
const isBlockingApplication = computed(() => appReadiness.value === 'blocked')
const installModalTitle = computed(() =>
  installSurface.value === 'manual'
    ? (installInstructions.value?.title ?? 'Jak zainstalować aplikację')
    : 'Zainstaluj Zeszyt Trenera'
)
const installModalBody = computed(() =>
  installSurface.value === 'manual'
    ? 'Zainstaluj zeszyt-trenera dla najlepszych wrażeń. Na tej przeglądarce zrobisz to ręcznie, a poniżej masz krótkie kroki.'
    : 'Zainstaluj zeszyt-trenera dla najlepszych wrażeń. Dzięki temu otworzysz go jak lokalną aplikację i wygodniej wrócisz do niego offline.'
)
const installEntryLabel = computed(() =>
  installSurface.value === 'manual'
    ? 'Jak zainstalować'
    : 'Zainstaluj aplikację'
)
const installPrimaryLabel = computed(() =>
  installSurface.value === 'manual'
    ? 'Rozumiem'
    : installPending.value
      ? 'Instalowanie...'
      : 'Zainstaluj Zeszyt Trenera'
)
const installCoachCopy = computed(() =>
  installSurface.value === 'manual'
    ? 'Tutaj wrócisz do krótkiej instrukcji dodania aplikacji do ekranu głównego.'
    : 'Tutaj wrócisz do instalacji, kiedy będziesz chciał zrobić to później.'
)
const activeModal = computed<'install' | 'update' | null>(() => {
  // Bootstrap and blocking screens must stay visually dominant until the local-first shell is actually usable.
  if (!isShellReady.value) {
    return null
  }

  if (updateModalVisible.value) {
    return 'update'
  }

  if (installModalVisible.value) {
    return 'install'
  }

  return null
})
const canAutoOpenInstallModal = computed(
  () => shouldAutoOpenInstallModal.value && !updateModalVisible.value
)

// The auto-open install modal is intentionally one-time so the shell nudges once without becoming repetitive on every launch.
watch(
  canAutoOpenInstallModal,
  (value) => {
    if (value) {
      appStore.openInstallModal('automatic')
    }
  },
  { immediate: true }
)

watch(installed, (value) => {
  if (value) {
    isMenuOpen.value = false
    appStore.hideInstallCoach()
  }
})

watch(showInstallEntry, (value) => {
  if (!value) {
    appStore.hideInstallCoach()
  }
})

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value

  if (!isMenuOpen.value) {
    appStore.hideInstallCoach()
  }
}

function closeMenu() {
  isMenuOpen.value = false
  appStore.hideInstallCoach()
}

function handleBack() {
  if (route.meta.backTo) {
    router.push(route.meta.backTo as string)
  } else {
    router.back()
  }
}

function openInstallEntry() {
  closeMenu()
  appStore.openInstallModal()
}

async function handleInstallPrimaryAction() {
  if (installSurface.value === 'manual') {
    appStore.dismissInstallModal()
    return
  }

  const wasAccepted = await promptInstall()

  if (wasAccepted || !showInstallEntry.value) {
    appStore.dismissInstallModal()
    appStore.hideInstallCoach()
  }
}

function handleInstallLater() {
  appStore.dismissInstallModal()
}

async function handleUpdatePrimaryAction() {
  await refreshApplication()
}

function handleUpdateLater() {
  appStore.dismissUpdateModal()
}

function reloadApplication() {
  window.location.reload()
}
</script>

<template>
  <div
    class="app-canvas min-h-screen text-on-surface font-body selection:bg-primary selection:text-white"
  >
    <template v-if="isShellReady">
      <header
        class="fixed top-0 w-full z-40 flex justify-between items-center px-6 h-16 bg-surface/90 backdrop-blur-md border-b border-on-surface/10 transition-colors"
      >
        <div class="flex items-center gap-4">
          <button
            v-if="route.meta.showBack"
            class="active:scale-95 transition-transform duration-75 text-on-surface hover:bg-surface-container-low p-2 rounded-full flex items-center justify-center"
            @click="handleBack"
          >
            <AppIcon name="arrow_back" />
          </button>
          <button
            v-else
            class="active:scale-95 transition-transform duration-75 text-on-surface relative"
            @click="toggleMenu"
          >
            <AppIcon name="menu" />
          </button>
          <h1
            class="font-headline uppercase tracking-tight font-bold text-primary"
          >
            {{ title }}
          </h1>
        </div>
        <div class="relative flex items-center gap-2">
          <span
            v-if="!isOnline"
            class="inline-flex items-center rounded-full border border-danger/25 bg-danger/10 px-2.5 py-1 font-mono text-[10px] text-danger font-bold uppercase"
            >Offline</span
          >
        </div>
      </header>

      <div v-if="isMenuOpen" class="fixed inset-0 z-50 flex">
        <div
          class="absolute inset-0 bg-black/25 backdrop-blur-sm"
          @click="closeMenu"
        ></div>
        <div
          class="relative w-72 max-w-[85vw] h-full bg-surface border-r border-on-surface/10 shadow-[0_24px_60px_rgba(17,41,39,0.2)] flex flex-col pt-16"
        >
          <div
            class="p-6 border-b border-on-surface/10 bg-surface-container-low"
          >
            <h2 class="font-headline uppercase font-bold text-lg">
              Zeszyt Trenera
            </h2>
            <p class="font-mono text-xs text-secondary mt-1">v0.1.0</p>
          </div>
          <nav
            v-if="navigationItems.length > 0"
            class="flex-1 overflow-y-auto py-4"
          >
            <RouterLink
              v-for="item in navigationItems"
              :key="item.name"
              :to="item.to"
              class="block px-6 py-4 font-mono text-sm uppercase font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              @click="closeMenu"
            >
              {{ item.label }}
            </RouterLink>
          </nav>
          <div class="p-6 border-t border-on-surface/10 bg-surface">
            <Transition name="overlay-pop">
              <div
                v-if="installCoachVisible && showInstallEntry"
                class="install-coach-card mb-4"
              >
                <p class="install-coach-card__eyebrow">Na później</p>
                <p class="install-coach-card__copy">
                  {{ installCoachCopy }}
                </p>
                <button
                  class="install-coach-card__action"
                  type="button"
                  @click="appStore.hideInstallCoach()"
                >
                  Rozumiem
                </button>
              </div>
            </Transition>
            <button
              v-if="showInstallEntry"
              class="w-full bg-primary text-white px-4 py-3 font-mono font-bold uppercase text-xs border border-on-surface hard-shadow transition-all duration-75 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:scale-95"
              type="button"
              @click="openInstallEntry"
            >
              {{ installEntryLabel }}
            </button>
            <button
              v-if="needRefresh"
              class="w-full mt-3 bg-surface text-on-surface px-4 py-3 font-mono font-bold uppercase text-xs border border-on-surface hard-shadow transition-all duration-75 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:scale-95"
              type="button"
              :disabled="updatePending"
              @click="handleUpdatePrimaryAction"
            >
              {{ updatePending ? 'Odświeżanie...' : 'Aktualizuj aplikację' }}
            </button>
          </div>
        </div>
      </div>

      <main class="pt-24 px-6 max-w-5xl mx-auto pb-32">
        <div v-if="updateError" class="mb-6 grid gap-3">
          <div class="message-banner message-banner--danger">
            <strong>Tryb offline wymaga uwagi</strong>
            <span>{{ updateError }}</span>
            <button
              class="message-banner__action"
              type="button"
              @click="appStore.clearUpdateError()"
            >
              Ukryj
            </button>
          </div>
        </div>

        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>

      <nav
        v-if="!route.meta.hideBottomNav"
        class="fixed bottom-0 left-0 w-full z-40 flex justify-around items-stretch h-20 pb-safe bg-surface/90 backdrop-blur-md border-t border-on-surface/10"
      >
        <RouterLink
          to="/"
          class="flex flex-col items-center justify-center px-4 py-1 transition-all w-full border-x border-on-surface/10"
          :class="[
            route.path === '/'
              ? 'bg-primary text-white'
              : 'text-on-surface hover:bg-surface-container-low'
          ]"
        >
          <AppIcon name="group" />
          <span
            class="font-mono text-[10px] tracking-tighter font-bold uppercase mt-1"
            >Członkowie</span
          >
        </RouterLink>
        <div
          class="flex flex-col items-center justify-center text-secondary px-4 py-1 w-full opacity-50 cursor-not-allowed"
        >
          <AppIcon name="payments" />
          <span
            class="font-mono text-[10px] tracking-tighter font-bold uppercase mt-1"
            >Płatności</span
          >
        </div>
        <div
          class="flex flex-col items-center justify-center text-secondary px-4 py-1 w-full opacity-50 cursor-not-allowed"
        >
          <AppIcon name="calendar_today" />
          <span
            class="font-mono text-[10px] tracking-tighter font-bold uppercase mt-1"
            >Obecność</span
          >
        </div>
      </nav>
    </template>

    <section
      v-else
      class="min-h-screen px-6 py-12 flex items-center justify-center"
    >
      <div class="shell-state-card">
        <p class="shell-state-card__eyebrow">
          {{ isBlockingApplication ? 'Stan aplikacji' : 'Uruchamianie' }}
        </p>
        <h1 class="shell-state-card__title">
          {{
            isBlockingApplication
              ? 'Nie udało się uruchomić Zeszytu Trenera'
              : 'Przygotowuję lokalny zeszyt'
          }}
        </h1>
        <p class="shell-state-card__copy">
          {{
            isBlockingApplication
              ? blockingMessage
              : 'Sprawdzam lokalną bazę danych, żeby nie dopuścić do startu z niedziałającym local-first storage.'
          }}
        </p>
        <div
          v-if="isBlockingApplication"
          class="flex flex-col sm:flex-row gap-3"
        >
          <button class="button-brand" type="button" @click="reloadApplication">
            Spróbuj ponownie
          </button>
        </div>
        <div v-else class="shell-state-card__loading" aria-hidden="true">
          <span class="shell-state-card__loading-line"></span>
        </div>
      </div>
    </section>

    <Transition name="overlay-pop">
      <div
        v-if="activeModal"
        class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-[rgba(17,41,39,0.45)] backdrop-blur-sm"
          @click="
            activeModal === 'update'
              ? handleUpdateLater()
              : handleInstallLater()
          "
        ></div>
        <section class="shell-modal relative w-full max-w-lg">
          <p class="shell-modal__eyebrow">
            {{
              activeModal === 'update'
                ? 'Aktualizacja gotowa'
                : installSurface === 'manual'
                  ? 'Instalacja ręczna'
                  : 'Instalacja PWA'
            }}
          </p>
          <h2 class="shell-modal__title">
            {{
              activeModal === 'update'
                ? 'Nowa wersja Zeszytu Trenera czeka'
                : installModalTitle
            }}
          </h2>
          <p class="shell-modal__copy">
            {{
              activeModal === 'update'
                ? 'Jest gotowa świeższa wersja aplikacji. Odśwież ją teraz, żeby pracować na aktualnym shellu i cache.'
                : installModalBody
            }}
          </p>
          <ol
            v-if="activeModal === 'install' && installInstructions"
            class="shell-modal__steps"
          >
            <li
              v-for="step in installInstructions.steps"
              :key="step"
              class="shell-modal__step"
            >
              {{ step }}
            </li>
          </ol>
          <div class="shell-modal__actions">
            <button
              v-if="activeModal === 'update'"
              class="button-brand"
              type="button"
              :disabled="updatePending"
              @click="handleUpdatePrimaryAction"
            >
              {{ updatePending ? 'Odświeżanie...' : 'Zaktualizuj teraz' }}
            </button>
            <button
              v-else
              class="button-brand"
              type="button"
              :disabled="installPending"
              @click="handleInstallPrimaryAction"
            >
              {{ installPrimaryLabel }}
            </button>
            <button
              class="button-secondary"
              type="button"
              @click="
                activeModal === 'update'
                  ? handleUpdateLater()
                  : handleInstallLater()
              "
            >
              Później
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Keeping shell-only styles scoped stops AppShell from becoming a second global source of truth. */
.button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3.25rem;
  padding: 0 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(16, 59, 55, 0.14);
  background: rgba(255, 255, 255, 0.74);
  color: var(--ink);
  font-weight: 700;
}

.shell-state-card {
  width: min(100%, 34rem);
  display: grid;
  gap: 1rem;
  padding: clamp(1.5rem, 4vw, 2.25rem);
  border-radius: 1.75rem;
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: rgba(249, 249, 249, 0.96);
  box-shadow: var(--shadow-strong);
}

.shell-state-card__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-hot);
}

.shell-state-card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 7vw, 3rem);
  line-height: 0.98;
  text-transform: uppercase;
  color: var(--accent-strong);
}

.shell-state-card__copy {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.6;
}

.shell-state-card__loading {
  width: 100%;
  height: 0.35rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(16, 59, 55, 0.08);
}

.shell-state-card__loading-line {
  display: block;
  width: 35%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-cool), var(--accent));
  animation: shell-loading 1.4s ease-in-out infinite;
}

.shell-modal {
  display: grid;
  gap: 1rem;
  padding: clamp(1.35rem, 4vw, 2rem);
  border-radius: 1.6rem;
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: rgba(249, 249, 249, 0.97);
  box-shadow: var(--shadow-strong);
}

.shell-modal__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-hot);
}

.shell-modal__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 6vw, 2.6rem);
  line-height: 1;
  text-transform: uppercase;
  color: var(--accent-strong);
}

.shell-modal__copy {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.6;
}

.shell-modal__steps {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: install-step;
}

.shell-modal__step {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  color: var(--ink);
  line-height: 1.5;
}

.shell-modal__step::before {
  counter-increment: install-step;
  content: counter(install-step);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  flex: 0 0 1.65rem;
  border-radius: 999px;
  background: rgba(15, 107, 87, 0.12);
  color: var(--accent-strong);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
}

.shell-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.install-coach-card {
  display: grid;
  gap: 0.55rem;
  padding: 0.95rem 1rem;
  border-radius: 1.15rem;
  border: 1px solid rgba(16, 59, 55, 0.1);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 28px rgba(17, 41, 39, 0.08);
}

.install-coach-card__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-hot);
}

.install-coach-card__copy {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.5;
}

.install-coach-card__action,
.message-banner__action {
  justify-self: flex-start;
  background: transparent;
  color: var(--accent-strong);
  font-weight: 700;
  padding: 0;
}

.fade-enter-active,
.fade-leave-active,
.overlay-pop-enter-active,
.overlay-pop-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.fade-enter-from,
.fade-leave-to,
.overlay-pop-enter-from,
.overlay-pop-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
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

@media (min-width: 640px) {
  .shell-modal__actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
