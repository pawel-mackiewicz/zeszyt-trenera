<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

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
const { promptInstall } = usePwaInstall()
const { refreshApplication } = useAppUpdate()

const {
  canInstall,
  installed,
  installPending,
  isOnline,
  needRefresh,
  updatePending
} = storeToRefs(appStore)

const title = computed(() => route.meta.title)
// Keeping menu entries derived from the router avoids shipping dead links in production builds.
const navigationItems = createNavigationItems()
const isMenuOpen = ref(false)

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function handleBack() {
  if (route.meta.backTo) {
    router.push(route.meta.backTo as string)
  } else {
    router.back()
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-surface text-on-surface font-body selection:bg-primary selection:text-white graph-paper pb-24"
  >
    <!-- Top Navigation Shell -->
    <header
      class="fixed top-0 w-full z-40 flex justify-between items-center px-6 h-16 bg-surface/90 backdrop-blur-md border-b border-on-surface shadow-none transition-colors"
    >
      <div class="flex items-center gap-4">
        <!-- Optional Back Button -->
        <button
          v-if="route.meta.showBack"
          class="active:scale-95 transition-transform duration-75 text-on-surface hover:bg-surface-container-low p-2 rounded-full flex items-center justify-center"
          @click="handleBack"
        >
          <AppIcon name="arrow_back" />
        </button>
        <!-- Optional Menu Button -->
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
      <div class="relative">
        <span
          v-if="!isOnline"
          class="font-mono text-[10px] text-danger font-bold mr-2"
          >OFFLINE</span
        >
      </div>
    </header>

    <!-- Side Menu Dropdown -->
    <div v-if="isMenuOpen" class="fixed inset-0 z-50 flex">
      <div
        class="absolute inset-0 bg-black/20 backdrop-blur-sm"
        @click="toggleMenu"
      ></div>
      <div
        class="relative w-64 h-full bg-surface border-r border-on-surface shadow-xl flex flex-col pt-16"
      >
        <div class="p-6 border-b border-on-surface bg-surface-container-low">
          <h2 class="font-headline uppercase font-bold text-lg">
            Zeszyt Trenera
          </h2>
          <p class="font-mono text-xs text-secondary mt-1">v1.0.0</p>
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
            @click="toggleMenu"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="p-6 border-t border-on-surface">
          <button
            v-if="canInstall && !installed"
            class="w-full bg-primary text-white px-4 py-2 font-mono font-bold uppercase text-xs border border-on-surface hard-shadow transition-all duration-75 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:scale-95"
            type="button"
            :disabled="installPending"
            @click="promptInstall"
          >
            {{ installPending ? 'Instalowanie...' : 'Zainstaluj Aplikację' }}
          </button>
          <button
            v-if="needRefresh"
            class="w-full mt-2 bg-surface text-on-surface px-4 py-2 font-mono font-bold uppercase text-xs border border-on-surface hard-shadow transition-all duration-75 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:scale-95"
            type="button"
            :disabled="updatePending"
            @click="refreshApplication"
          >
            {{ updatePending ? 'Odświeżanie...' : 'Aktualizuj' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="pt-24 px-6 max-w-5xl mx-auto">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <!-- Bottom Navigation Shell -->
    <nav
      v-if="!route.meta.hideBottomNav"
      class="fixed bottom-0 left-0 w-full z-40 flex justify-around items-stretch h-20 pb-safe bg-surface/90 backdrop-blur-md border-t-2 border-on-surface shadow-none"
    >
      <RouterLink
        to="/"
        class="flex flex-col items-center justify-center px-4 py-1 transition-all w-full border-x border-on-surface"
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
  </div>
</template>

<style>
/* Global theme extensions for the design system */
:root {
  --primary: #ae1417;
  --surface: #f9f9f9;
  --on-surface: #1a1c1c;
  --secondary: #5f5e5e;
  --surface-container-low: #f3f3f3;
  --outline-variant: #e4beba;
  --danger: #ba1a1a;
}
.graph-paper {
  background-color: var(--surface);
  background-image: radial-gradient(
    var(--outline-variant) 1px,
    transparent 1px
  );
  background-size: 20px 20px;
  background-attachment: fixed;
}
.hard-shadow {
  box-shadow: 2px 2px 0px 0px #1a1c1c;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
input:focus {
  outline: none !important;
  border-bottom: 2px solid var(--primary) !important;
  box-shadow: none !important;
}
</style>
