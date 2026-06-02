<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <div class="mb-12">
    <div
      class="inline-block bg-primary text-white px-4 py-2 border border-on-surface hide-empty hard-shadow"
    >
      <span class="font-headline text-5xl font-black leading-none uppercase">
        {{ label }}
      </span>
    </div>
  </div>
</template>
