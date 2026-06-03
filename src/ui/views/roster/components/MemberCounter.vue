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
      <Transition name="member-counter-label" mode="out-in">
        <span
          :key="label"
          class="block font-headline text-5xl font-black leading-none uppercase"
        >
          {{ label }}
        </span>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.member-counter-label-enter-active,
.member-counter-label-leave-active {
  transition: opacity 240ms var(--ease-standard);
}

.member-counter-label-enter-from,
.member-counter-label-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .member-counter-label-enter-active,
  .member-counter-label-leave-active {
    transition: opacity 120ms ease;
  }
}
</style>
