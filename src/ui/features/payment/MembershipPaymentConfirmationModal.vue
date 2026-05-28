<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmationModal, {
  type ConfirmationModalDetail
} from '@/ui/components/modals/ConfirmationModal.vue'
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
const isModalVisible = computed(() => props.visible && props.member !== null)
const details = computed<ConfirmationModalDetail[]>(() => {
  if (props.member === null) {
    return []
  }

  const modalDetails: ConfirmationModalDetail[] = [
    {
      label: t('confirmation.memberLabel'),
      value: props.member.memberName
    },
    {
      label: t('confirmation.monthLabel'),
      value: props.member.coveredMonthLabel
    },
    {
      label: t('confirmation.ageLabel'),
      value: props.member.ageLabel
    }
  ]

  if (props.member.attendanceCount > 0) {
    modalDetails.push({
      label: t('confirmation.attendanceLabel'),
      value: t('confirmation.attendanceValue', {
        count: props.member.attendanceCount
      })
    })
  }

  return modalDetails
})

function requestConfirm() {
  emit('confirm')
}
</script>

<template>
  <ConfirmationModal
    :visible="isModalVisible"
    :title="t('confirmation.title')"
    :body="
      t('confirmation.body', {
        memberName: props.member?.memberName ?? '',
        month: props.member?.coveredMonthLabel ?? ''
      })
    "
    :details="details"
    :detail-columns="2"
    :confirm-label="t('confirmation.actions.confirm')"
    :pending-label="t('confirmation.actions.pending')"
    :cancel-label="t('confirmation.actions.cancel')"
    :is-pending="props.isPending"
    :error-message="props.errorMessage"
    :error-title="props.errorTitle"
    actions-class="payments-confirmation__actions"
    backdrop-test-id="payments-confirmation-backdrop"
    confirm-test-id="payment-confirmation-confirm"
    cancel-test-id="payment-confirmation-cancel"
    detail-class="payments-confirmation__detail"
    @close="emit('close')"
    @confirm="requestConfirm"
    @dismiss-error="emit('dismissError')"
  />
</template>
