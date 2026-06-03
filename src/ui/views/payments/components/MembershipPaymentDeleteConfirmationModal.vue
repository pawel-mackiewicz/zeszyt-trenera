<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmationModal, {
  type ConfirmationModalDetail
} from '@/ui/components/modals/ConfirmationModal.vue'
import { MEMBERSHIP_PAYMENT_DELETE_CONFIRMATION_MODAL_MESSAGES } from './MembershipPaymentDeleteConfirmationModal.messages'

export type MembershipPaymentDeleteConfirmationModalMember = {
  ageLabel: string
  coveredMonthLabel: string
  memberName: string
}

const props = withDefaults(
  defineProps<{
    errorMessage?: string
    errorTitle?: string
    isPending?: boolean
    member: MembershipPaymentDeleteConfirmationModalMember | null
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
  messages: MEMBERSHIP_PAYMENT_DELETE_CONFIRMATION_MODAL_MESSAGES
})
const isModalVisible = computed(() => props.visible && props.member !== null)
const details = computed<ConfirmationModalDetail[]>(() => {
  if (props.member === null) {
    return []
  }

  return [
    {
      label: t('deleteConfirmation.memberLabel'),
      value: props.member.memberName
    },
    {
      label: t('deleteConfirmation.monthLabel'),
      value: props.member.coveredMonthLabel
    },
    {
      label: t('deleteConfirmation.ageLabel'),
      value: props.member.ageLabel
    }
  ]
})

function requestConfirm() {
  emit('confirm')
}
</script>

<template>
  <ConfirmationModal
    :visible="isModalVisible"
    :title="t('deleteConfirmation.title')"
    :details="details"
    :detail-columns="2"
    :confirm-label="t('deleteConfirmation.actions.confirm')"
    :pending-label="t('deleteConfirmation.actions.pending')"
    :cancel-label="t('deleteConfirmation.actions.cancel')"
    :is-pending="props.isPending"
    :error-message="props.errorMessage"
    :error-title="props.errorTitle"
    actions-class="payments-delete-confirmation__actions"
    backdrop-test-id="payments-delete-confirmation-backdrop"
    confirm-test-id="payment-delete-confirmation-confirm"
    cancel-test-id="payment-delete-confirmation-cancel"
    detail-class="payments-delete-confirmation__detail"
    @close="emit('close')"
    @confirm="requestConfirm"
    @dismiss-error="emit('dismissError')"
  />
</template>
