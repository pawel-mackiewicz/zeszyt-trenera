<script setup lang="ts">
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
</script>

<template>
  <AppButton icon-only variant="secondary" class="delete-icon-button">
    <AppIcon name="circle_x" />
  </AppButton>
</template>

<style scoped>
.delete-icon-button.app-button--secondary:hover:not(:disabled),
.delete-icon-button.app-button--secondary:focus-visible {
  border-color: var(--color-on-surface);
  background: var(--color-danger);
  color: var(--color-on-primary);
}
</style>
