import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useShellStore = defineStore('shell', () => {
  // What: isolate transient sidebar visibility in its own shell-only store. Why: Header and the extracted sidebar menu need a shared mobile-first UI contract without leaking local refs through props or touching persisted application data.
  const sidebarOpen = ref(false)

  function openSidebar() {
    sidebarOpen.value = true
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar
  }
})
