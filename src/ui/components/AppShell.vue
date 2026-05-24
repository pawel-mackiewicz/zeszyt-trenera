<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import { resolveShellRouteTitle } from '@/ui/components/app-shell/AppShell.config'
import BottomNavigation from '@/ui/components/app-shell/BottomNavigation.vue'
import Header from '@/ui/components/app-shell/Header.vue'
import SidebarMenu from '@/ui/components/app-shell/SidebarMenu.vue'
import { APP_SHELL_MESSAGES } from '@/ui/components/app-shell/AppShell.messages'
import ResetDataModal from '@/ui/features/app_reset/ResetDataModal.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import InstallModal from '@/ui/features/app_install/InstallModal.vue'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import type { AppRouteName } from '@/ui/router'
import { RouterView, useRoute, useRouter } from '@/ui/router/runtime'
import DemoIntroModal from '@/ui/features/demo/DemoIntroModal.vue'
import { useAppStore } from '@/ui/stores/app'
import { useAppUpdateStore } from '@/ui/stores/app-update.store'
import { useShellStore } from '@/ui/stores/shell.store'

type ObservableSubscription = {
  unsubscribe(): void
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const appUpdateStore = useAppUpdateStore()
const shellStore = useShellStore()
const { queries } = useAppServices()
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})

useNetworkStatus()
// What: start PWA checks from the shell lifecycle. Why: the update store lets menu actions and banners share one registration without prop drilling or duplicate service-worker setup.
appUpdateStore.registerUpdateChecks()

const { appReadiness, blockingIssue, setupStatus } = storeToRefs(appStore)
const { updateError } = storeToRefs(appUpdateStore)

let setupStatusSubscription: ObservableSubscription | null = null

const appName = computed(() => t('app.name'))
const currentRouteName = computed(() => {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
})
const isSetupClubRoute = computed(() => currentRouteName.value === 'setup-club')
const isSetupTrainerRoute = computed(
  () => currentRouteName.value === 'setup-trainer'
)
const isSetupRoute = computed(
  () => isSetupClubRoute.value || isSetupTrainerRoute.value
)
// What: resolve the browser title with the shared shell title helper. Why: AppShell owns document metadata, while the header composable should stay scoped to visible chrome only.
const title = computed(() =>
  resolveShellRouteTitle({
    routeName: currentRouteName.value,
    fallbackTitle: appName.value,
    translate: t
  })
)
const isSetupChecking = computed(
  () => appReadiness.value === 'ready' && setupStatus.value === 'checking'
)
const isSetupGateActive = computed(
  () =>
    appReadiness.value === 'ready' &&
    (setupStatus.value === 'requires-club' ||
      setupStatus.value === 'requires-trainer')
)
const isShellReady = computed(
  () => appReadiness.value === 'ready' && setupStatus.value === 'ready'
)
const isBlockingApplication = computed(() => appReadiness.value === 'blocked')
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
    : isSetupChecking.value
      ? t('shellState.setupChecking.eyebrow')
      : t('shellState.checking.eyebrow')
)
const shellStateTitle = computed(() =>
  isBlockingApplication.value
    ? t('shellState.blocked.title')
    : isSetupChecking.value
      ? t('shellState.setupChecking.title')
      : t('shellState.checking.title')
)
const shellStateCopy = computed(() => {
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
function unsubscribeSetupStatus() {
  setupStatusSubscription?.unsubscribe()
  setupStatusSubscription = null
}

function subscribeToSetupStatus() {
  if (setupStatusSubscription) {
    return
  }

  // What: observe setup completion from one app-level read model. Why: the shell should unlock and reroute from club to trainer automatically after local writes, without setup views owning shell state.
  setupStatusSubscription = queries.observeSetupStatus.handle().subscribe({
    next(nextStatus) {
      appStore.setSetupStatus(nextStatus)
    },
    error(error) {
      appStore.blockApplication('bootstrap')
      console.error('Failed to observe application setup status.', error)
    }
  })
}

watch(
  appReadiness,
  (value) => {
    if (value === 'ready') {
      // What: reset the setup gate before subscribing. Why: after the database opens, the shell needs a neutral loading state while the first onboarding status arrives.
      appStore.setSetupStatus('checking')
      subscribeToSetupStatus()
      return
    }

    unsubscribeSetupStatus()
  },
  { immediate: true }
)

watch(
  [appReadiness, setupStatus, currentRouteName],
  ([readiness, nextSetupStatus, routeName]) => {
    if (readiness !== 'ready') {
      return
    }

    if (nextSetupStatus === 'requires-club' && routeName !== 'setup-club') {
      router.replace('/setup/club')
      return
    }

    if (
      nextSetupStatus === 'requires-trainer' &&
      routeName !== 'setup-trainer'
    ) {
      router.replace('/setup/trainer')
      return
    }

    if (nextSetupStatus === 'ready' && isSetupRoute.value) {
      router.replace('/member')
    }
  },
  { immediate: true, flush: 'sync' }
)

watch(
  () => route.fullPath,
  () => {
    // What: collapse transient navigation overlays after every route change. Why: the hamburger sidebar should never linger over the next screen after navigation completes.
    shellStore.closeSidebar()
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

onBeforeUnmount(() => {
  unsubscribeSetupStatus()
})

function reloadApplication() {
  // What: restart the whole shell from the blocking recovery CTA. Why: a cold boot is the safest local-first recovery path after startup state gets stuck or IndexedDB opens incorrectly.
  window.location.reload()
}
</script>

<template>
  <div
    class="app-canvas min-h-screen text-on-surface font-body selection:bg-primary selection:text-white"
  >
    <template v-if="isShellReady">
      <!-- What: mount the merged shell header above the sidebar. Why: the shell keeps layout ownership while Header owns the visible route chrome and its composable-owned controls. -->
      <Header />

      <!-- What: mount the smart sidebar menu beside the header. Why: AppShell should place menu chrome without owning menu state, backup workflows, or locale controls. -->
      <SidebarMenu />

      <!-- What: mount the smart demo overlay from the feature folder. Why: AppShell should provide shell placement while demo exit state and application workflow wiring stay inside the demo feature. -->
      <DemoIntroModal />

      <!-- What: mount the smart reset overlay from the feature folder. Why: AppShell should own global overlay placement while reset confirmation, errors, and application-layer workflow stay behind the reset feature boundary. -->
      <ResetDataModal />

      <main class="pt-24 px-6 max-w-5xl mx-auto pb-32">
        <FloatingErrorAlert
          v-if="updateErrorMessage"
          :message="updateErrorMessage"
          :title="t('update.bannerTitle')"
          top-offset="shell"
          @dismiss="appUpdateStore.clearUpdateError()"
        />

        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>

      <!-- What: mount the smart bottom navigation as shell chrome. Why: AppShell should place persistent navigation without owning route-specific tab state. -->
      <BottomNavigation />
    </template>

    <section
      v-else-if="isSetupGateActive"
      class="min-h-screen px-6 py-10 sm:py-12 flex items-center justify-center"
    >
      <!-- What: keep first-run setup outside the normal shell chrome. Why: required club and trainer assignment should stay focused and unskippable until the local notebook is complete. -->
      <div class="w-full flex justify-center">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
    </section>

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
          <!-- What: route shell recovery and modal actions through the shared button primitive. Why: these shell-only flows still need the same tactile CTA feedback as the main views without keeping a second copy of the recipe here. -->
          <AppButton type="button" @click="reloadApplication">
            {{ t('shellState.retry') }}
          </AppButton>
        </div>
        <div v-else class="shell-state-card__loading" aria-hidden="true">
          <span class="shell-state-card__loading-line"></span>
        </div>
      </div>
    </section>

    <!-- What: mount the smart install overlay from the feature folder. Why: PWA prompt state, demo-mode suppression, and one-time install nudging now belong to the app-install feature boundary. -->
    <InstallModal />
  </div>
</template>

<style scoped>
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

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  /* What: keep route transitions on opacity only. Why: applying transform to the routed view root turns it into the containing block for nested fixed-position FABs, which makes mobile actions render inline for a frame on reload before snapping back to the viewport. */
  opacity: 0;
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
