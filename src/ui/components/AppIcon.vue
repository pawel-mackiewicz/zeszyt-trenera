<script setup lang="ts">
import { CircleCheckBig, CircleX, Archive, ArchiveRestore } from '@lucide/vue'
type IconName =
  | 'add'
  | 'arrow_back'
  | 'arrow_downward'
  | 'arrow_upward'
  | 'chevron_right'
  | 'check_circle'
  | 'circle_x'
  | 'archive'
  | 'calendar_today'
  | 'expand_more'
  | 'group'
  | 'history'
  | 'menu'
  | 'payments'
  | 'search'
  | 'terrain'
  | 'unarchive'

// Keeping the icon set inline avoids the remote icon webfont that left the shell blank offline.
defineProps<{
  name: IconName
}>()
</script>

<template>
  <svg
    aria-hidden="true"
    class="app-icon"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.8"
    viewBox="0 0 24 24"
  >
    <template v-if="name === 'arrow_back'">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </template>
    <template v-else-if="name === 'arrow_upward'">
      <!-- What: add dedicated sort-direction arrows to the local icon set. Why: the roster sort controls need unmistakable ascending and descending cues that still render offline inside the installed PWA. -->
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </template>
    <template v-else-if="name === 'arrow_downward'">
      <path d="M12 5v14" />
      <path d="m18 13-6 6-6-6" />
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </template>
    <template v-else-if="name === 'add'">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'check_circle'">
      <CircleCheckBig />
    </template>
    <template v-else-if="name === 'expand_more'">
      <path d="m6 9 6 6 6-6" />
    </template>
    <template v-else-if="name === 'chevron_right'">
      <!-- What: add a forward chevron to the local icon set. Why: editable attendance history rows need a compact visual cue that still works offline without the remote icon font. -->
      <path d="m9 6 6 6-6 6" />
    </template>
    <template v-else-if="name === 'circle_x'">
      <CircleX />
    </template>
    <template v-else-if="name === 'archive'">
      <Archive />
    </template>
    <template v-else-if="name === 'unarchive'">
      <ArchiveRestore />
    </template>
    <template v-else-if="name === 'group'">
      <path d="M8.5 12a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
      <path d="M16.5 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
      <path d="M3.5 19a5 5 0 0 1 10 0" />
      <path d="M14 19a4 4 0 0 1 6.5-3.1" />
    </template>
    <template v-else-if="name === 'payments'">
      <rect height="10" rx="1.5" width="16" x="4" y="7" />
      <path d="M4 10h16" />
      <path d="M8 14h3" />
      <path d="m12 18 2-2-2-2" />
      <path d="M14 16h-5" />
    </template>
    <template v-else-if="name === 'calendar_today'">
      <rect height="15" rx="1.5" width="16" x="4" y="5" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 9h16" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
    </template>
    <template v-else-if="name === 'history'">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </template>
    <template v-else-if="name === 'terrain'">
      <path d="M3 19h18" />
      <path d="m4 19 5.5-12 4.2 8 2.1-3.5L21 19" />
      <path d="m8.2 10.5 1.3 1.2 1.5-1.7" />
    </template>
  </svg>
</template>

<style scoped>
.app-icon {
  display: block;
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
}
</style>
