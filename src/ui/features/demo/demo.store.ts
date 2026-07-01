import { ref } from 'vue'
import { defineStore } from 'pinia'

export const DemoIntroModalPath = {
  Startup: 'startup',
  Exit: 'exit'
} as const
export type DemoIntroModalPathValue =
  (typeof DemoIntroModalPath)[keyof typeof DemoIntroModalPath]

export const useDemoStore = defineStore('demo', () => {
  // What: isolate demo-shell state in its own Pinia slice. Why: demo onboarding and exit wiring should evolve independently from general bootstrap and install concerns.
  const demoModeActive = ref(false)
  const demoIntroModalVisible = ref(false)
  const demoIntroModalPath = ref<DemoIntroModalPathValue>(
    DemoIntroModalPath.Startup
  )

  function setDemoModeActive(value: boolean) {
    demoModeActive.value = value

    if (!value) {
      // What: clear the intro modal whenever demo mode turns off. Why: once the seeded notebook is gone, the shell must not keep stale exit copy mounted from the previous session.
      demoIntroModalVisible.value = false
    }
  }

  function showDemoIntroModal(
    path: DemoIntroModalPathValue = DemoIntroModalPath.Startup
  ) {
    demoIntroModalPath.value = path
    demoIntroModalVisible.value = true
  }

  function dismissDemoIntroModal() {
    demoIntroModalVisible.value = false
  }

  return {
    demoModeActive,
    demoIntroModalVisible,
    demoIntroModalPath,
    setDemoModeActive,
    showDemoIntroModal,
    dismissDemoIntroModal
  }
})
