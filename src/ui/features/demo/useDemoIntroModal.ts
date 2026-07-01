import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useAppStore } from '@/ui/stores/app'
import {
  DemoModalStatus,
  type DemoModalStatusValue
} from '@/ui/features/demo/DemoModal.contract'
import { DemoIntroModalPath, useDemoStore } from '@/ui/features/demo/demo.store'

export function useDemoIntroModal() {
  const appStore = useAppStore()
  const demoStore = useDemoStore()

  const { appReadiness, setupStatus } = storeToRefs(appStore)
  const { demoIntroModalPath, demoIntroModalVisible } = storeToRefs(demoStore)

  const isShellReady = computed(
    () => appReadiness.value === 'ready' && setupStatus.value === 'ready'
  )
  // What: derive the intro modal status inside the demo feature. Why: the component can stay prop-free while shell readiness and shared modal state remain behind the feature store.
  const demoIntroModalStatus = computed<DemoModalStatusValue>(() => {
    const introPathVisible =
      demoIntroModalVisible.value &&
      demoIntroModalPath.value === DemoIntroModalPath.Startup

    return isShellReady.value && introPathVisible
      ? DemoModalStatus.Ready
      : DemoModalStatus.Hidden
  })
  const isDemoIntroModalVisible = computed(
    () => demoIntroModalStatus.value !== DemoModalStatus.Hidden
  )

  function closeDemoIntroModal() {
    demoStore.dismissDemoIntroModal()
  }

  return {
    demoIntroModalStatus,
    isDemoIntroModalVisible,
    closeDemoIntroModal
  }
}
