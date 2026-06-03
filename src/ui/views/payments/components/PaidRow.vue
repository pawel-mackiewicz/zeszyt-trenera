<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PaidMembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import DeleteIconButton from '@/ui/components/DeleteIconButton.vue'

import BasePaymentRow from './BasePaymentRow.vue'
import {
  type MembershipPaymentDisplayMember,
  useMembershipPaymentActionContext
} from '../membershipPaymentActions'

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
  <BasePaymentRow class="payments-paid-row bg-emerald-50/70">
    <template #name>{{ memberName }}</template>
    <template #meta>{{ ageLabel }}</template>
    <template #aside>
      <div class="payments-paid-actions">
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

@media (max-width: 719px) {
  .payments-paid-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .payments-paid-row :deep(.payments-member-row__aside),
  .payments-paid-actions {
    display: contents;
  }

  .payments-paid-actions :deep(.delete-icon-button) {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
    justify-self: end;
  }
}

@media (min-width: 720px) {
  .payments-paid-actions {
    justify-self: end;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "deletePaymentFor": "Usuń płatność: {memberName}"
    }
  },
  "en": {
    "actions": {
      "deletePaymentFor": "Delete payment: {memberName}"
    }
  }
}
</i18n>
