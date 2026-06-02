<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import AppButton from '@/ui/components/AppButton.vue'
import ArchiveIconButton from '@/ui/components/ArchiveIconButton.vue'
import MemberArchiveConfirmationModal from '../MemberArchiveConfirmationModal.vue'

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
const archiveModalVisible = ref(false)
const isArchivingMember = ref(false)

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

function openArchiveConfirmation() {
  if (isArchivingMember.value) {
    return
  }

  archiveModalVisible.value = true
}

function closeArchiveConfirmation() {
  if (isArchivingMember.value) {
    return
  }

  archiveModalVisible.value = false
}

function finishArchiveMember() {
  archiveModalVisible.value = false
}
</script>

<template>
  <BasePaymentRow class="unpaid-absent-row bg-surface-container-low/60">
    <template #name>{{ memberName }}</template>
    <template #meta>{{ ageLabel }}</template>
    <template #aside>
      <div class="payments-member-actions w-full sm:w-auto">
        <AppButton
          :id="`payments-remind-${props.member.id}`"
          :disabled="
            !props.member.hasPhoneNumber ||
            isReminderInFlight ||
            isArchivingMember
          "
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
          :disabled="isArchivingMember"
          variant="secondary"
          type="button"
          @click="handleMarkAsPaid"
        >
          {{ t('actions.markAsPaid') }}
        </AppButton>
        <ArchiveIconButton
          :id="`payments-open-archive-${props.member.id}`"
          data-testid="payments-member-archive-open"
          :aria-label="
            t('actions.archiveMemberAria', {
              name: memberName
            })
          "
          :disabled="isArchivingMember || archiveModalVisible"
          :title="
            t('actions.archiveMemberAria', {
              name: memberName
            })
          "
          type="button"
          @click="openArchiveConfirmation"
        />
      </div>
    </template>
  </BasePaymentRow>
  <MemberArchiveConfirmationModal
    :member="props.member"
    :visible="archiveModalVisible"
    @archived="finishArchiveMember"
    @close="closeArchiveConfirmation"
    @pending-change="isArchivingMember = $event"
  />
</template>

<style scoped>
.payments-member-actions {
  display: grid;
  gap: 0.5rem;
  width: 100%;
}

.payments-member-actions :deep(.archive-icon-button) {
  justify-self: end;
}

@media (max-width: 719px) {
  .unpaid-absent-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .unpaid-absent-row :deep(.payments-member-row__aside),
  .payments-member-actions {
    display: contents;
  }

  .payments-member-actions :deep(.app-button:not(.archive-icon-button)) {
    grid-column: 1 / -1;
    width: 100%;
  }

  .payments-member-actions :deep(.archive-icon-button) {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
  }
}

@media (min-width: 720px) {
  .payments-member-actions {
    grid-template-columns: repeat(3, minmax(0, auto));
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "archiveMemberAria": "Zarchiwizuj członka {name}",
      "markAsPaid": "Oznacz jako opłacone",
      "remind": "Przypomnij",
      "reminding": "Otwieranie..."
    }
  },
  "en": {
    "actions": {
      "archiveMemberAria": "Archive member {name}",
      "markAsPaid": "Mark as paid",
      "remind": "Remind",
      "reminding": "Opening..."
    }
  }
}
</i18n>
