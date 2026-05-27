<script setup lang="ts">
import { onBeforeUnmount, onMounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import { MEMBERSHIP_PAYMENT_CONFIRMATION_MODAL_MESSAGES } from './MembershipPaymentConfirmationModal.messages'

export type MembershipPaymentConfirmationModalMember = {
  attendanceCount: number
  ageLabel: string
  coveredMonthLabel: string
  memberName: string
}

const props = withDefaults(
  defineProps<{
    errorMessage?: string
    errorTitle?: string
    isPending?: boolean
    member: MembershipPaymentConfirmationModalMember | null
    visible: boolean
  }>(),
  {
    errorMessage: '',
    errorTitle: '',
    isPending: false
  }
)

const emit = defineEmits<{
  close: []
  confirm: []
  dismissError: []
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: MEMBERSHIP_PAYMENT_CONFIRMATION_MODAL_MESSAGES
})
// What: generate a component-local title id for dialog labelling. Why: the modal can be rendered in Storybook and the app without relying on one global DOM id.
const titleId = useId()

function requestClose() {
  if (props.isPending) {
    return
  }

  emit('close')
}

function requestConfirm() {
  if (props.isPending || props.member === null) {
    return
  }

  emit('confirm')
}

function dismissError() {
  emit('dismissError')
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !props.visible || props.member === null) {
    return
  }

  // What: keep keyboard dismissal with the extracted modal. Why: the view should not know which DOM events are needed to operate the dialog shell.
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
  <!-- What: keep the payment confirmation overlay as a reusable component. Why: the payments view should own application-layer writes while the modal owns accessible presentation, dismissal, and pending-state controls. -->
  <Transition name="payments-overlay">
    <div
      v-if="props.visible && props.member"
      class="fixed inset-0 z-70 flex items-end justify-center p-4 sm:items-center"
    >
      <div
        class="payments-confirmation__backdrop"
        data-testid="payments-confirmation-backdrop"
        @click="requestClose"
      ></div>
      <section
        :aria-labelledby="titleId"
        aria-modal="true"
        class="relative grid w-full max-w-lg gap-4 border border-on-surface bg-surface p-5 hard-shadow"
        role="dialog"
      >
        <p
          class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
        >
          {{ t('confirmation.eyebrow') }}
        </p>
        <h3
          :id="titleId"
          class="font-headline text-[2rem] font-bold uppercase tracking-tight"
        >
          {{ t('confirmation.title') }}
        </h3>
        <p class="text-sm leading-6 text-secondary">
          {{
            t('confirmation.body', {
              memberName: props.member.memberName,
              month: props.member.coveredMonthLabel
            })
          }}
        </p>

        <dl class="grid gap-3 sm:grid-cols-2">
          <div class="payments-confirmation__detail">
            <dt
              class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
            >
              {{ t('confirmation.memberLabel') }}
            </dt>
            <dd
              class="font-headline text-lg font-bold uppercase tracking-tight"
            >
              {{ props.member.memberName }}
            </dd>
          </div>
          <div class="payments-confirmation__detail">
            <dt
              class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
            >
              {{ t('confirmation.monthLabel') }}
            </dt>
            <dd
              class="font-headline text-lg font-bold uppercase tracking-tight"
            >
              {{ props.member.coveredMonthLabel }}
            </dd>
          </div>
          <div class="payments-confirmation__detail">
            <dt
              class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
            >
              {{ t('confirmation.ageLabel') }}
            </dt>
            <dd
              class="font-headline text-lg font-bold uppercase tracking-tight"
            >
              {{ props.member.ageLabel }}
            </dd>
          </div>
          <div
            v-if="props.member.attendanceCount > 0"
            class="payments-confirmation__detail"
          >
            <dt
              class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
            >
              {{ t('confirmation.attendanceLabel') }}
            </dt>
            <dd
              class="font-headline text-lg font-bold uppercase tracking-tight"
            >
              {{
                t('confirmation.attendanceValue', {
                  count: props.member.attendanceCount
                })
              }}
            </dd>
          </div>
        </dl>

        <FloatingErrorAlert
          v-if="props.errorMessage"
          :message="props.errorMessage"
          :title="props.errorTitle"
          stack-level="modal"
          top-offset="shell"
          @dismiss="dismissError"
        />

        <div
          class="payments-confirmation__actions flex flex-col gap-3 sm:flex-row sm:justify-end"
        >
          <AppButton
            :disabled="props.isPending"
            data-testid="payment-confirmation-confirm"
            type="button"
            @click="requestConfirm"
          >
            {{
              props.isPending
                ? t('confirmation.actions.pending')
                : t('confirmation.actions.confirm')
            }}
          </AppButton>
          <AppButton
            :disabled="props.isPending"
            data-testid="payment-confirmation-cancel"
            variant="secondary"
            type="button"
            @click="requestClose"
          >
            {{ t('confirmation.actions.cancel') }}
          </AppButton>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.payments-confirmation__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(2px);
}

.payments-confirmation__detail {
  display: grid;
  gap: 0.35rem;
  padding: 0.875rem;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container-low);
}

.payments-overlay-enter-active,
.payments-overlay-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.payments-overlay-enter-from,
.payments-overlay-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
