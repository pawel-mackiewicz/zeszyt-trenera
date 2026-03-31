<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppIcon from '@/ui/components/AppIcon.vue'
import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { persistLocale, type AppLocale } from '@/ui/i18n'
import {
  createNavigationItems,
  type AppRouteName,
  type NavigationItem
} from '@/ui/router'
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
const { t, tm } = useI18n({ useScope: 'local' })
const { locale } = useI18n({ useScope: 'global' })

useNetworkStatus()
const { promptInstall, manualInstallVariant } = usePwaInstall()
// Registering the worker here keeps background update checks tied to the shell lifecycle while leaving the actual activation behind an explicit menu action.
const { needRefresh, refreshApplication, updatePending } = useAppUpdate()

const {
  appReadiness,
  blockingIssue,
  installCoachVisible,
  installed,
  installModalVisible,
  installPending,
  installSurface,
  isOnline,
  showInstallEntry,
  shouldAutoOpenInstallModal,
  updateError
} = storeToRefs(appStore)

const appVersion = __APP_VERSION__
const localeOptions = [
  { value: 'pl', label: 'PL' },
  { value: 'en', label: 'EN' }
] as const satisfies ReadonlyArray<{ value: AppLocale; label: string }>
// The shell owns route chrome labels so document titles can react to locale changes without leaking translated strings into router metadata.
const routeTitleKeys = {
  'members-list': 'routes.membersList',
  'add-member': 'routes.addMember',
  'attendance-history': 'routes.attendanceHistory',
  'attendance-record': 'routes.attendanceRecord',
  'debug-indexeddb': 'routes.debugIndexedDb'
} as const satisfies Record<AppRouteName, string>
const navigationLabelKeys: Partial<Record<AppRouteName, string>> = {
  'debug-indexeddb': 'menu.debugIndexedDb'
}
// Keeping menu entries derived from the router avoids shipping dead links in production builds.
const navigationItems = createNavigationItems()
const isMenuOpen = ref(false)
const isAttendanceMenuOpen = ref(false)

const appName = computed(() => t('app.name'))
const currentRouteName = computed(() => {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
})
const isAttendanceHistoryRoute = computed(
  () => currentRouteName.value === 'attendance-history'
)
const isAttendanceRecordRoute = computed(
  () => currentRouteName.value === 'attendance-record'
)
const isAttendanceSectionActive = computed(
  () => isAttendanceHistoryRoute.value || isAttendanceRecordRoute.value
)
const title = computed(() => {
  const routeName = currentRouteName.value

  return routeName ? t(routeTitleKeys[routeName]) : appName.value
})
const isShellReady = computed(() => appReadiness.value === 'ready')
const isBlockingApplication = computed(() => appReadiness.value === 'blocked')
const manualInstallTranslationKey = 'install.manual.iosSafari' as const
const installModalEyebrow = computed(() =>
  installSurface.value === 'manual'
    ? t('install.manual.eyebrow')
    : t('install.native.eyebrow')
)
const installModalTitle = computed(() =>
  installSurface.value === 'manual'
    ? t(`${manualInstallTranslationKey}.title`)
    : t('install.native.title')
)
const installModalBody = computed(() =>
  installSurface.value === 'manual'
    ? t(`${manualInstallTranslationKey}.body`)
    : t('install.native.body')
)
const installEntryLabel = computed(() =>
  installSurface.value === 'manual'
    ? t('install.entry.manual')
    : t('install.entry.native')
)
const installPrimaryLabel = computed(() =>
  installSurface.value === 'manual'
    ? t('common.understand')
    : installPending.value
      ? t('install.native.pending')
      : t('install.native.primary')
)
const installCoachCopy = computed(() =>
  installSurface.value === 'manual'
    ? t('install.coach.manual')
    : t('install.coach.native')
)
const manualInstallSteps = computed(() => {
  if (manualInstallVariant.value === null) {
    return [] as string[]
  }

  // What: the shell renders the Safari-specific fallback instructions here. Why: iOS Safari is the only browser family that reaches the manual-install path in the current flow.
  return tm(`${manualInstallTranslationKey}.steps`) as string[]
})
const updateActionLabel = computed(() =>
  updatePending.value ? t('update.action.pending') : t('update.action.ready')
)
const updateErrorMessage = computed(() => {
  if (!updateError.value) {
    return null
  }

  // What: derive the banner copy from the safe error kind only. Why: browser update errors should never be echoed back into the production UI.
  return t(`update.error.${updateError.value.kind}`)
})
const shellStateEyebrow = computed(() =>
  isBlockingApplication.value
    ? t('shellState.blocked.eyebrow')
    : t('shellState.checking.eyebrow')
)
const shellStateTitle = computed(() =>
  isBlockingApplication.value
    ? t('shellState.blocked.title')
    : t('shellState.checking.title')
)
const shellStateCopy = computed(() => {
  if (!isBlockingApplication.value) {
    return t('shellState.checking.body')
  }

  return blockingIssue.value === 'database'
    ? t('shellState.blocked.database')
    : t('shellState.blocked.unknown')
})
const isInstallModalActive = computed(() => {
  // Bootstrap and blocking screens must stay visually dominant until the local-first shell is actually usable.
  return isShellReady.value && installModalVisible.value
})

// The auto-open install modal is intentionally one-time so the shell nudges once without becoming repetitive on every launch.
watch(
  shouldAutoOpenInstallModal,
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
    isAttendanceMenuOpen.value = false
    appStore.hideInstallCoach()
  }
})

watch(showInstallEntry, (value) => {
  if (!value) {
    appStore.hideInstallCoach()
  }
})

watch(
  () => route.fullPath,
  () => {
    // What: collapse transient navigation overlays after every route change. Why: the attendance switcher and hamburger menu should never linger over the next screen after navigation completes.
    isMenuOpen.value = false
    isAttendanceMenuOpen.value = false
    appStore.hideInstallCoach()
  }
)

watch(
  [title, appName],
  ([nextTitle, nextAppName]) => {
    // Keeping title updates in the shell lets the visible route labels and browser title share the same local dictionary.
    document.title =
      nextTitle === nextAppName ? nextAppName : `${nextTitle} • ${nextAppName}`
  },
  { immediate: true }
)

function toggleMenu() {
  isAttendanceMenuOpen.value = false
  isMenuOpen.value = !isMenuOpen.value

  if (!isMenuOpen.value) {
    appStore.hideInstallCoach()
  }
}

function closeMenu() {
  isMenuOpen.value = false
  appStore.hideInstallCoach()
}

function toggleAttendanceMenu() {
  isMenuOpen.value = false
  isAttendanceMenuOpen.value = !isAttendanceMenuOpen.value
}

function closeAttendanceMenu() {
  isAttendanceMenuOpen.value = false
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

async function handleUpdateAction() {
  await refreshApplication()
}

function reloadApplication() {
  window.location.reload()
}

function changeLocale(nextLocale: AppLocale) {
  if (locale.value === nextLocale) {
    return
  }

  locale.value = nextLocale
  persistLocale(nextLocale)
}

function navigationLabel(item: NavigationItem) {
  const translationKey =
    navigationLabelKeys[item.name] ?? routeTitleKeys[item.name]

  return t(translationKey)
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
            >{{ t('network.offline') }}</span
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
              {{ appName }}
            </h2>
            <p class="font-mono text-xs text-secondary mt-1">
              v{{ appVersion }}
            </p>
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
              {{ navigationLabel(item) }}
            </RouterLink>
          </nav>
          <div class="p-6 border-t border-on-surface/10 bg-surface">
            <div class="mb-4">
              <p
                class="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-secondary"
              >
                {{ t('menu.languageLabel') }}
              </p>
              <div class="locale-switcher">
                <button
                  v-for="option in localeOptions"
                  :key="option.value"
                  class="locale-switcher__button"
                  :class="{
                    'locale-switcher__button--active': locale === option.value
                  }"
                  :aria-pressed="locale === option.value"
                  :data-testid="`locale-${option.value}`"
                  type="button"
                  @click="changeLocale(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <Transition name="overlay-pop">
              <div
                v-if="installCoachVisible && showInstallEntry"
                class="install-coach-card mb-4"
              >
                <p class="install-coach-card__eyebrow">
                  {{ t('install.coach.eyebrow') }}
                </p>
                <p class="install-coach-card__copy">
                  {{ installCoachCopy }}
                </p>
                <button
                  class="install-coach-card__action"
                  type="button"
                  @click="appStore.hideInstallCoach()"
                >
                  {{ t('common.understand') }}
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
              class="w-full mt-3 bg-surface text-on-surface px-4 py-3 font-mono font-bold uppercase text-xs border border-on-surface hard-shadow transition-all duration-75 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:scale-95 disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[6px_6px_0_0_var(--color-on-surface)]"
              type="button"
              :disabled="updatePending"
              @click="handleUpdateAction"
            >
              {{ updateActionLabel }}
            </button>
          </div>
        </div>
      </div>

      <main class="pt-24 px-6 max-w-5xl mx-auto pb-32">
        <div v-if="updateErrorMessage" class="mb-6 grid gap-3">
          <div class="message-banner message-banner--danger">
            <strong>{{ t('update.bannerTitle') }}</strong>
            <span>{{ updateErrorMessage }}</span>
            <button
              class="message-banner__action"
              type="button"
              @click="appStore.clearUpdateError()"
            >
              {{ t('common.hide') }}
            </button>
          </div>
        </div>

        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>

      <!-- What: keep the attendance menu dismiss layer available on every viewport. Why: the attendance switcher is now part of the primary shell nav, so desktop users need the same outside-click escape hatch as mobile users. -->
      <button
        v-if="!route.meta.hideBottomNav && isAttendanceMenuOpen"
        class="fixed inset-0 z-30 bg-transparent"
        type="button"
        :aria-label="t('bottomNav.closeMenu')"
        @click="closeAttendanceMenu"
      ></button>

      <!-- What: render the bottom navigation on desktop and mobile. Why: after the attendance IA split, hiding this bar above `md` removed the only direct way to switch attendance screens in browser-sized layouts. -->
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
            >{{ t('bottomNav.members') }}</span
          >
        </RouterLink>
        <div
          class="flex flex-col items-center justify-center text-secondary px-4 py-1 w-full opacity-50 cursor-not-allowed"
        >
          <AppIcon name="payments" />
          <span
            class="font-mono text-[10px] tracking-tighter font-bold uppercase mt-1"
            >{{ t('bottomNav.payments') }}</span
          >
        </div>
        <div
          class="relative w-full border-x border-on-surface/10"
          :class="[
            isAttendanceSectionActive
              ? 'bg-primary text-white'
              : 'text-on-surface hover:bg-surface-container-low'
          ]"
        >
          <div
            v-if="isAttendanceMenuOpen"
            class="absolute inset-x-3 bottom-[calc(100%+0.75rem)] border border-on-surface bg-white text-on-surface hard-shadow"
          >
            <!-- What: split attendance into “Historia” and “Nowy trening” right above the active bottom-tab affordance. Why: the V2 IA makes attendance a small local switcher instead of forcing coaches through one route that tries to do both jobs. -->
            <RouterLink
              class="block px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] transition-colors"
              :class="[
                isAttendanceRecordRoute
                  ? 'bg-surface-container-low text-primary'
                  : 'hover:bg-surface-container-low'
              ]"
              to="/attendance/new"
              @click="closeAttendanceMenu"
            >
              {{ t('bottomNav.newTraining') }}
            </RouterLink>
            <RouterLink
              class="block border-t border-on-surface/10 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] transition-colors"
              :class="[
                isAttendanceHistoryRoute
                  ? 'bg-surface-container-low text-primary'
                  : 'hover:bg-surface-container-low'
              ]"
              to="/attendance"
              @click="closeAttendanceMenu"
            >
              {{ t('bottomNav.history') }}
            </RouterLink>
          </div>

          <button
            class="flex h-full w-full flex-col items-center justify-center px-4 py-1 transition-all"
            type="button"
            :aria-expanded="isAttendanceMenuOpen"
            :aria-label="t('bottomNav.attendanceMenu')"
            @click="toggleAttendanceMenu"
          >
            <AppIcon name="calendar_today" />
            <span
              class="font-mono text-[10px] tracking-tighter font-bold uppercase mt-1"
              >{{ t('bottomNav.attendance') }}</span
            >
          </button>
        </div>
      </nav>
    </template>

    <section
      v-else
      class="min-h-screen px-6 py-12 flex items-center justify-center"
    >
      <div class="shell-state-card">
        <p class="shell-state-card__eyebrow">{{ shellStateEyebrow }}</p>
        <h1 class="shell-state-card__title">{{ shellStateTitle }}</h1>
        <p class="shell-state-card__copy">{{ shellStateCopy }}</p>
        <div
          v-if="isBlockingApplication"
          class="flex flex-col sm:flex-row gap-3"
        >
          <button class="button-brand" type="button" @click="reloadApplication">
            {{ t('shellState.retry') }}
          </button>
        </div>
        <div v-else class="shell-state-card__loading" aria-hidden="true">
          <span class="shell-state-card__loading-line"></span>
        </div>
      </div>
    </section>

    <Transition name="overlay-pop">
      <div
        v-if="isInstallModalActive"
        class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-[rgba(17,41,39,0.45)] backdrop-blur-sm"
          @click="handleInstallLater()"
        ></div>
        <section class="shell-modal relative w-full max-w-lg">
          <p class="shell-modal__eyebrow">{{ installModalEyebrow }}</p>
          <h2 class="shell-modal__title">{{ installModalTitle }}</h2>
          <p class="shell-modal__copy">{{ installModalBody }}</p>
          <ol v-if="manualInstallSteps.length > 0" class="shell-modal__steps">
            <li
              v-for="step in manualInstallSteps"
              :key="step"
              class="shell-modal__step"
            >
              {{ step }}
            </li>
          </ol>
          <div class="shell-modal__actions">
            <button
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
              @click="handleInstallLater()"
            >
              {{ t('common.later') }}
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

.locale-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.locale-switcher__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.6rem;
  border-radius: 999px;
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: rgba(255, 255, 255, 0.78);
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.locale-switcher__button--active {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  color: white;
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

<i18n lang="json">
{
  "pl": {
    "app": {
      "name": "Zeszyt Trenera"
    },
    "common": {
      "hide": "Ukryj",
      "later": "Później",
      "understand": "Rozumiem"
    },
    "network": {
      "offline": "Offline"
    },
    "menu": {
      "debugIndexedDb": "Debug IndexedDB",
      "languageLabel": "Język"
    },
    "routes": {
      "membersList": "Członkowie",
      "addMember": "Dodaj członka",
      "attendanceHistory": "Historia treningów",
      "attendanceRecord": "Nowy trening",
      "debugIndexedDb": "Podgląd IndexedDB"
    },
    "bottomNav": {
      "members": "Członkowie",
      "payments": "Płatności",
      "attendance": "Obecność",
      "attendanceMenu": "Przełącz widok obecności",
      "closeMenu": "Zamknij menu obecności",
      "history": "Historia",
      "newTraining": "Nowy trening"
    },
    "install": {
      "entry": {
        "manual": "Jak zainstalować",
        "native": "Zainstaluj aplikację"
      },
      "coach": {
        "eyebrow": "Na później",
        "manual": "Tutaj wrócisz do krótkiej instrukcji dodania aplikacji do ekranu głównego.",
        "native": "Tutaj wrócisz do instalacji, kiedy będziesz chciał zrobić to później."
      },
      "manual": {
        "eyebrow": "Instalacja ręczna",
        "iosSafari": {
          "title": "Dodaj do ekranu głównego",
          "body": "Zainstaluj zeszyt-trenera dla najlepszych wrażeń. Na tej przeglądarce zrobisz to ręcznie, a poniżej masz krótkie kroki.",
          "steps": [
            "Stuknij przycisk Udostępnij w Safari.",
            "Wybierz Do ekranu głównego i potwierdź dodanie aplikacji."
          ]
        }
      },
      "native": {
        "eyebrow": "Instalacja PWA",
        "title": "Zainstaluj Zeszyt Trenera",
        "body": "Zainstaluj zeszyt-trenera dla najlepszych wrażeń. Dzięki temu otworzysz go jak lokalną aplikację i wygodniej wrócisz do niego offline.",
        "primary": "Zainstaluj Zeszyt Trenera",
        "pending": "Instalowanie..."
      }
    },
    "update": {
      "action": {
        "ready": "Aktualizuj aplikację",
        "pending": "Odświeżanie..."
      },
      "bannerTitle": "Tryb offline wymaga uwagi",
      "error": {
        "registration": "Nie udało się przygotować trybu offline.",
        "activation": "Nie udało się włączyć najnowszej wersji aplikacji. Zamknij ją i otwórz ponownie."
      }
    },
    "shellState": {
      "retry": "Spróbuj ponownie",
      "checking": {
        "eyebrow": "Uruchamianie",
        "title": "Przygotowuję lokalny zeszyt",
        "body": "Przygotowuję Twoje dane, żeby zeszyt mógł otworzyć się bezpiecznie i działać offline."
      },
      "blocked": {
        "eyebrow": "Stan aplikacji",
        "title": "Nie udało się uruchomić Zeszytu Trenera",
        "database": "Nie udało się otworzyć zeszytu na tym urządzeniu.",
        "unknown": "Aplikacja nie może się teraz uruchomić. Spróbuj ponownie."
      }
    }
  },
  "en": {
    "app": {
      "name": "Coach Notebook"
    },
    "common": {
      "hide": "Hide",
      "later": "Later",
      "understand": "Understood"
    },
    "network": {
      "offline": "Offline"
    },
    "menu": {
      "debugIndexedDb": "Debug IndexedDB",
      "languageLabel": "Language"
    },
    "routes": {
      "membersList": "Members",
      "addMember": "Add member",
      "attendanceHistory": "Training history",
      "attendanceRecord": "New training",
      "debugIndexedDb": "IndexedDB Inspector"
    },
    "bottomNav": {
      "members": "Members",
      "payments": "Payments",
      "attendance": "Attendance",
      "attendanceMenu": "Toggle attendance views",
      "closeMenu": "Close attendance menu",
      "history": "History",
      "newTraining": "New training"
    },
    "install": {
      "entry": {
        "manual": "How to install",
        "native": "Install app"
      },
      "coach": {
        "eyebrow": "Later",
        "manual": "Return here when you need the short guide for adding the app to the home screen.",
        "native": "Return here when you want to install the app later."
      },
      "manual": {
        "eyebrow": "Manual install",
        "iosSafari": {
          "title": "Add to Home Screen",
          "body": "Install Coach Notebook for the best experience. This browser needs the manual flow, and the short steps are below.",
          "steps": [
            "Tap the Share button in Safari.",
            "Choose Add to Home Screen and confirm the app."
          ]
        }
      },
      "native": {
        "eyebrow": "PWA install",
        "title": "Install Coach Notebook",
        "body": "Install Coach Notebook for the best experience. It will open like a local app and will be easier to return to offline.",
        "primary": "Install Coach Notebook",
        "pending": "Installing..."
      }
    },
    "update": {
      "action": {
        "ready": "Update app",
        "pending": "Refreshing..."
      },
      "bannerTitle": "Offline mode needs attention",
      "error": {
        "registration": "Offline mode could not be prepared.",
        "activation": "The latest app version could not be applied. Close and reopen the app."
      }
    },
    "shellState": {
      "retry": "Try again",
      "checking": {
        "eyebrow": "Starting",
        "title": "Preparing the local notebook",
        "body": "Preparing your data so the notebook can open safely and stay available offline."
      },
      "blocked": {
        "eyebrow": "App state",
        "title": "Coach Notebook could not start",
        "database": "The notebook could not be opened on this device.",
        "unknown": "The app cannot start right now. Try again."
      }
    }
  }
}
</i18n>
