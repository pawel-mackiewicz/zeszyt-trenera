<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import AppButton from '@/ui/components/AppButton.vue'

import BasePaymentRow from './BasePaymentRow.vue'
import {
  type MembershipPaymentDisplayMember,
  useMembershipPaymentActionContext
} from './membershipPaymentActions'

const props = defineProps<{
  formatAge: (member: MembershipPaymentDisplayMember) => string
  formatMemberName: (member: MembershipPaymentDisplayMember) => string
  member: MembershipPaymentStatusMemberListItem
}>()

const { t } = useI18n({ useScope: 'local' })
const paymentActions = useMembershipPaymentActionContext()

const memberName = computed(() => props.formatMemberName(props.member))
const ageLabel = computed(() => props.formatAge(props.member))
const isReminderInFlight = computed(() =>
  paymentActions.isSendingReminderForMember(props.member.id)
)

function handleSendReminder() {
  void paymentActions.sendReminder(props.member)
}

function handleMarkAsPaid() {
  paymentActions.openPaymentConfirmation(props.member)
}
</script>

<template>
  <BasePaymentRow class="bg-surface-container-low/60">
    <template #name>{{ memberName }}</template>
    <template #meta>{{ ageLabel }}</template>
    <template #aside>
      <div class="payments-member-actions w-full sm:w-auto">
        <AppButton
          :id="`payments-remind-${props.member.id}`"
          :disabled="!props.member.hasPhoneNumber || isReminderInFlight"
          class="w-full sm:w-auto"
          variant="secondary"
          type="button"
          @click="handleSendReminder"
        >
          {{
            isReminderInFlight ? t('actions.reminding') : t('actions.remind')
          }}
        </AppButton>
        <AppButton
          :id="`payments-open-confirm-${props.member.id}`"
          class="w-full sm:w-auto"
          variant="secondary"
          type="button"
          @click="handleMarkAsPaid"
        >
          {{ t('actions.markAsPaid') }}
        </AppButton>
      </div>
    </template>
  </BasePaymentRow>
</template>

<style scoped>
.payments-member-actions {
  display: grid;
  gap: 0.5rem;
  width: 100%;
}

@media (min-width: 720px) {
  .payments-member-actions {
    grid-template-columns: repeat(2, minmax(0, auto));
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "markAsPaid": "Oznacz jako opłacone",
      "remind": "Przypomnij",
      "reminding": "Otwieranie..."
    }
  },
  "en": {
    "actions": {
      "markAsPaid": "Mark as paid",
      "remind": "Remind",
      "reminding": "Opening..."
    }
  }
}
</i18n>
