<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { resolveShellRouteTitle } from '@/ui/components/app-shell/AppShell.config'
import BottomNavigation from '@/ui/components/app-shell/BottomNavigation.vue'
import Header from '@/ui/components/app-shell/Header.vue'
import RouteTransition from '@/ui/components/app-shell/RouteTransition.vue'
import ShellStatusScreen from '@/ui/components/app-shell/ShellStatusScreen.vue'
import SetupPhaseLayout from '@/ui/components/app-shell/SetupPhaseLayout.vue'
import SidebarMenu from '@/ui/components/app-shell/SidebarMenu.vue'
import { APP_SHELL_MESSAGES } from '@/ui/components/app-shell/AppShell.messages'
import ResetDataModal from '@/ui/features/app_reset/ResetDataModal.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import InstallModal from '@/ui/features/app_install/InstallModal.vue'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import type { AppRouteName } from '@/ui/router'
import { useRoute } from '@/ui/router/runtime'
import DemoIntroModal from '@/ui/features/demo/DemoIntroModal.vue'
import { useAppStore } from '@/ui/stores/app'
import { useAppUpdateStore } from '@/ui/stores/app-update.store'
import { useShellStore } from '@/ui/stores/shell.store'

type ShellPhase = 'ready' | 'setup' | 'state'

const route = useRoute()
const appStore = useAppStore()
const appUpdateStore = useAppUpdateStore()
const shellStore = useShellStore()
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})

useNetworkStatus()
// What: start PWA checks from the shell lifecycle. Why: the update store lets menu actions and banners share one registration without prop drilling or duplicate service-worker setup.
appUpdateStore.registerUpdateChecks()

const { appReadiness, setupStatus } = storeToRefs(appStore)
const { updateError } = storeToRefs(appUpdateStore)

const appName = computed(() => t('app.name'))
const currentRouteName = computed(() => {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
})
// What: resolve the browser title with the shared shell title helper. Why: AppShell owns document metadata, while the header composable should stay scoped to visible chrome only.
const title = computed(() =>
  resolveShellRouteTitle({
    routeName: currentRouteName.value,
    fallbackTitle: appName.value,
    translate: t
  })
)
const shellPhase = computed<ShellPhase>(() => {
  if (appReadiness.value !== 'ready') {
    return 'state'
  }

  if (setupStatus.value === 'ready') {
    return 'ready'
  }

  // What: keep setup rendering as one explicit shell phase. Why: setup navigation now owns redirects, so AppShell only needs to decide whether to show onboarding chrome or a state panel.
  return setupStatus.value === 'checking' ? 'state' : 'setup'
})
const updateErrorMessage = computed(() => {
  if (!updateError.value) {
    return null
  }

  // What: derive the banner copy from the safe error kind only. Why: browser update errors should never be echoed back into the production UI.
  return t(`update.error.${updateError.value.kind}`)
})

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
</script>

<template>
  <div
    class="app-canvas min-h-screen text-on-surface font-body selection:bg-primary selection:text-white"
  >
    <template v-if="shellPhase === 'ready'">
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

        <RouteTransition />
      </main>

      <!-- What: mount the smart bottom navigation as shell chrome. Why: AppShell should place persistent navigation without owning route-specific tab state. -->
      <BottomNavigation />
    </template>

    <SetupPhaseLayout v-else-if="shellPhase === 'setup'" />
    <ShellStatusScreen v-else />

    <!-- What: mount the smart install overlay from the feature folder. Why: PWA prompt state, demo-mode suppression, and one-time install nudging now belong to the app-install feature boundary. -->
    <InstallModal />
  </div>
</template>
