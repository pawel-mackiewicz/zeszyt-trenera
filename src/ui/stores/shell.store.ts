import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useShellStore = defineStore('shell', () => {
  // What: isolate transient drawer visibility in its own shell-only store. Why: Header and AppShell drawer need a shared UI contract without leaking local refs through props or touching persisted application data.
  const drawerOpen = ref(false)

  function openDrawer() {
    drawerOpen.value = true
  }

  function closeDrawer() {
    drawerOpen.value = false
  }

  function toggleDrawer() {
    drawerOpen.value = !drawerOpen.value
  }

  return {
    drawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer
  }
})
