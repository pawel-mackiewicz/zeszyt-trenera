<script setup lang="ts">
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'

defineProps<{
  message: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

function dismissAlert() {
  emit('dismiss')
}
</script>

<template>
  <!-- What: pin demo failures to the modal alert lane. Why: leave-demo retries happen inside an overlay, so the shared floating alert must rise above that layer without every caller repeating stack defaults. -->
  <FloatingErrorAlert
    :message="message"
    stack-level="modal"
    top-offset="shell"
    @dismiss="dismissAlert"
  />
</template>
