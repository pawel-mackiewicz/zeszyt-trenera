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

type UnpaidAttendedMember = MembershipPaymentStatusMemberListItem & {
  attendanceSessionIds?: string[]
}

const props = defineProps<{
  formatAge: (member: MembershipPaymentDisplayMember) => string
  formatMemberName: (member: MembershipPaymentDisplayMember) => string
  member: UnpaidAttendedMember
}>()

const { t } = useI18n({ useScope: 'local' })
const paymentActions = useMembershipPaymentActionContext()

const memberName = computed(() => props.formatMemberName(props.member))
const ageLabel = computed(() => props.formatAge(props.member))
const attendanceBadge = computed(() =>
  t('table.attendanceBadge', {
    count: props.member.attendanceSessionIds?.length ?? 0
  })
)
const isReminderInFlight = computed(() =>
  paymentActions.isSendingReminderForMember(props.member.id)
)

function handleSendReminder() {
  void paymentActions.sendReminder(props.member)
}

function handleMarkAsPaid() {
  paymentActions.openPaymentConfirmation(
    props.member,
    props.member.attendanceSessionIds?.length ?? 0
  )
}
</script>

<template>
  <BasePaymentRow class="bg-primary/5">
    <template #name>{{ memberName }}</template>
    <template #badge>
      <span class="payments-attendance-badge">{{ attendanceBadge }}</span>
    </template>
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
.payments-attendance-badge {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-primary);
}

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
    },
    "table": {
      "attendanceBadge": "{count} TR."
    }
  },
  "en": {
    "actions": {
      "markAsPaid": "Mark as paid",
      "remind": "Remind",
      "reminding": "Opening..."
    },
    "table": {
      "attendanceBadge": "{count} SES."
    }
  }
}
</i18n>
