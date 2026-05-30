<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PaidMembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import AppIcon from '@/ui/components/AppIcon.vue'
import DeleteIconButton from '@/ui/components/DeleteIconButton.vue'

import BasePaymentRow from './BasePaymentRow.vue'
import {
  type MembershipPaymentDisplayMember,
  useMembershipPaymentActionContext
} from './membershipPaymentActions'

const props = defineProps<{
  formatAge: (member: MembershipPaymentDisplayMember) => string
  formatMemberName: (member: MembershipPaymentDisplayMember) => string
  member: PaidMembershipPaymentStatusMemberListItem
}>()

const { t } = useI18n({ useScope: 'local' })
const paymentActions = useMembershipPaymentActionContext()

const memberName = computed(() => props.formatMemberName(props.member))
const ageLabel = computed(() => props.formatAge(props.member))
const deleteActionLabel = computed(() =>
  t('actions.deletePaymentFor', { memberName: memberName.value })
)

function handleDelete() {
  paymentActions.openPaymentDeletion(props.member)
}
</script>

<template>
  <BasePaymentRow class="payments-member-row--paid bg-emerald-50/70">
    <template #name>{{ memberName }}</template>
    <template #meta>{{ ageLabel }}</template>
    <template #aside>
      <div class="payments-paid-actions">
        <span class="payments-paid-indicator">
          <AppIcon name="check_circle" />
          <span>{{ t('table.paid') }}</span>
        </span>
        <DeleteIconButton
          :id="`payments-open-delete-${props.member.id}`"
          :aria-label="deleteActionLabel"
          :title="deleteActionLabel"
          type="button"
          @click="handleDelete"
        />
      </div>
    </template>
  </BasePaymentRow>
</template>

<style scoped>
.payments-paid-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  justify-self: end;
}

.payments-paid-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  justify-self: start;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--success);
}

.payments-paid-indicator :deep(.app-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

@media (max-width: 500px) {
  .payments-paid-actions {
    justify-self: start;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "deletePaymentFor": "Usuń płatność: {memberName}"
    },
    "table": {
      "paid": "Opłacone"
    }
  },
  "en": {
    "actions": {
      "deletePaymentFor": "Delete payment: {memberName}"
    },
    "table": {
      "paid": "Paid"
    }
  }
}
</i18n>
