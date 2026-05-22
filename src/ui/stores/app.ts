import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { SetupStatus } from '@/read/ObserveSetupStatusQuery'

export type AppReadiness = 'checking' | 'ready' | 'blocked'
export type BlockingIssue = 'database' | 'bootstrap' | null

export const useAppStore = defineStore('app', () => {
  const isOnline = ref(window.navigator.onLine)
  const appReadiness = ref<AppReadiness>('checking')
  // Keeping only the issue code here lets the shell translate failure copy locally instead of storing hydrated text in shared state.
  const blockingIssue = ref<BlockingIssue>(null)
  const dbConnected = ref(false)
  // What: keep setup completeness separate from database readiness. Why: the shell must distinguish between "cannot boot" and "booted, but still missing required local identity data".
  const setupStatus = ref<SetupStatus>('checking')

  function setOnlineStatus(value: boolean) {
    isOnline.value = value
  }

  function setAppReady() {
    appReadiness.value = 'ready'
    blockingIssue.value = null
  }

  function blockApplication(issue: Exclude<BlockingIssue, null>) {
    appReadiness.value = 'blocked'
    blockingIssue.value = issue
  }

  function setDbConnected(value: boolean) {
    dbConnected.value = value
  }

  function setSetupStatus(value: SetupStatus) {
    setupStatus.value = value
  }

  return {
    isOnline,
    appReadiness,
    blockingIssue,
    dbConnected,
    setupStatus,
    setOnlineStatus,
    setAppReady,
    blockApplication,
    setDbConnected,
    setSetupStatus
  }
})
