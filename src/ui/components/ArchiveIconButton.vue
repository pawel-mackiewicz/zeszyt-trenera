<script setup lang="ts">
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
</script>

<template>
  <AppButton icon-only variant="secondary" class="archive-icon-button">
    <AppIcon name="archive" />
  </AppButton>
</template>

<style scoped>
.archive-icon-button.app-button--secondary:hover:not(:disabled),
.archive-icon-button.app-button--secondary:focus-visible {
  border-color: var(--color-primary);
  background: var(--color-surface-container-low);
  color: var(--color-primary);
}
</style>
