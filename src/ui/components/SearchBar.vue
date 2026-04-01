<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/ui/components/AppIcon.vue'

const props = defineProps<{
  modelValue: string
  inputId: string
  placeholder: string
  inputLabel: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

// What: centralize the compact member-name search field shared by the list screens. Why: attendance now defines the mobile-first search affordance, so the roster views should reuse one accessible input instead of drifting through copy-pasted variants.
const searchValue = computed({
  get: () => props.modelValue,
  set: (value: string) => {
    emit('update:modelValue', value)
  }
})
</script>

<template>
  <div class="flex items-center gap-4 border-b border-on-surface pb-2">
    <AppIcon class="text-primary" name="search" />
    <input
      :id="inputId"
      v-model="searchValue"
      :aria-label="inputLabel"
      class="w-full border-none bg-transparent p-0 font-mono text-lg uppercase placeholder:text-outline-variant focus:ring-0"
      :placeholder="placeholder"
      type="text"
    />
  </div>
</template>
