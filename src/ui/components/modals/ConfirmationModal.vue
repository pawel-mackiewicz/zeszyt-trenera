<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'

export type ConfirmationModalDetail = {
  label: string
  value: string
}

type ConfirmationModalDetailColumns = 1 | 2 | 3
type ConfirmationModalSize = 'lg' | 'xl'

const props = withDefaults(
  defineProps<{
    actionsClass?: string
    backdropTestId?: string
    body?: string
    cancelLabel: string
    cancelTestId?: string
    confirmLabel: string
    confirmTestId?: string
    detailColumns?: ConfirmationModalDetailColumns
    detailClass?: string
    details?: ConfirmationModalDetail[]
    detailsClass?: string
    errorMessage?: string
    errorTitle?: string
    hideCancel?: boolean
    isPending?: boolean
    pendingLabel?: string
    size?: ConfirmationModalSize
    title: string
    visible: boolean
  }>(),
  {
    actionsClass: '',
    backdropTestId: '',
    body: '',
    cancelTestId: '',
    confirmTestId: '',
    detailColumns: 2,
    detailClass: '',
    details: () => [],
    detailsClass: '',
    errorMessage: '',
    errorTitle: '',
    hideCancel: false,
    isPending: false,
    pendingLabel: '',
    size: 'lg'
  }
)

const emit = defineEmits<{
  close: []
  confirm: []
  dismissError: []
}>()

const confirmButtonLabel = computed(() =>
  props.isPending && props.pendingLabel
    ? props.pendingLabel
    : props.confirmLabel
)

function requestClose() {
  if (props.isPending) {
    return
  }

  emit('close')
}

function requestConfirm() {
  if (props.isPending) {
    return
  }

  emit('confirm')
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !props.visible) {
    return
  }

  requestClose()
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<template>
  <BaseModal
    :visible="props.visible"
    :title="props.title"
    :backdrop-test-id="props.backdropTestId"
    :size="props.size"
    :actions-class="props.actionsClass"
    @close="requestClose"
  >
    <p v-if="props.body" class="base-modal__copy">{{ props.body }}</p>

    <dl
      v-if="props.details.length > 0"
      class="confirmation-modal__details"
      :class="[
        `confirmation-modal__details--${props.detailColumns}`,
        props.detailsClass
      ]"
    >
      <div
        v-for="detail in props.details"
        :key="`${detail.label}:${detail.value}`"
        class="confirmation-modal__detail"
        :class="props.detailClass"
      >
        <dt class="confirmation-modal__detail-label">{{ detail.label }}</dt>
        <dd class="confirmation-modal__detail-value">{{ detail.value }}</dd>
      </div>
    </dl>

    <slot />

    <FloatingErrorAlert
      v-if="props.errorMessage"
      :message="props.errorMessage"
      :title="props.errorTitle"
      stack-level="modal"
      top-offset="shell"
      @dismiss="emit('dismissError')"
    />

    <template #actions>
      <AppButton
        :disabled="props.isPending"
        :data-testid="props.confirmTestId || undefined"
        type="button"
        @click="requestConfirm"
      >
        {{ confirmButtonLabel }}
      </AppButton>
      <AppButton
        v-if="!props.hideCancel"
        :disabled="props.isPending"
        :data-testid="props.cancelTestId || undefined"
        variant="secondary"
        type="button"
        @click="requestClose"
      >
        {{ props.cancelLabel }}
      </AppButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.confirmation-modal__details {
  display: grid;
  gap: 0.75rem;
}

.confirmation-modal__detail {
  display: grid;
  gap: 0.35rem;
  padding: 0.875rem;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container-low);
}

.confirmation-modal__detail-label {
  margin: 0;
  font-family: var(--font-label);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.confirmation-modal__detail-value {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.15;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

@media (min-width: 640px) {
  .confirmation-modal__details--2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .confirmation-modal__details--3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
