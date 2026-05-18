import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { resolveShellRouteTitle } from '@/ui/components/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/components/app-shell/AppShell.messages'
import type { AppRouteName } from '@/ui/router'
import { useRoute, useRouter } from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'
import { useShellStore } from '@/ui/stores/shell.store'

export function useAppShellHeader() {
  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const shellStore = useShellStore()
  const { isOnline } = storeToRefs(appStore)
  const { t } = useI18n({
    useScope: 'local',
    messages: APP_SHELL_MESSAGES
  })

  const appName = computed(() => t('app.name'))
  const currentRouteName = computed(() => {
    return typeof route.name === 'string' ? (route.name as AppRouteName) : null
  })
  // What: keep header labels in the merged component sourced from the same shell title resolver as the browser title. Why: route chrome should stay consistent without reintroducing a separate manager component.
  const title = computed(() =>
    resolveShellRouteTitle({
      routeName: currentRouteName.value,
      fallbackTitle: appName.value,
      translate: t
    })
  )
  const backButtonLabel = computed(() => t('header.back'))
  const menuButtonLabel = computed(() => t('header.menu'))
  const offlineLabel = computed(() => t('network.offline'))
  const showBack = computed(() => Boolean(route.meta.showBack))
  const showOfflineBadge = computed(() => !isOnline.value)

  function handleBack() {
    // What: honor route-level back targets before falling back to history navigation. Why: detail screens in the mobile PWA need deterministic exits even after deep links or restored sessions.
    if (route.meta.backTo) {
      router.push(route.meta.backTo as string)
      return
    }

    router.back()
  }

  function handleToggleDrawer() {
    // What: route the hamburger action through the shared shell store. Why: the drawer lives in AppShell, so the merged header needs the same store boundary the manager used before.
    shellStore.toggleDrawer()
  }

  return {
    backButtonLabel,
    menuButtonLabel,
    offlineLabel,
    showBack,
    showOfflineBadge,
    title,
    handleBack,
    handleToggleDrawer
  }
}
