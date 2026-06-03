<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { PaidMembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'

import BasePaymentSection from './BasePaymentSection.vue'
import PaidRow from './PaidRow.vue'
import type { MembershipPaymentDisplayMember } from '../membershipPaymentActions'

const props = defineProps<{
  formatAge: (member: MembershipPaymentDisplayMember) => string
  formatMemberName: (member: MembershipPaymentDisplayMember) => string
  members: PaidMembershipPaymentStatusMemberListItem[]
}>()

const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <BasePaymentSection
    :empty-message="t('sections.paid.empty')"
    :is-empty="props.members.length === 0"
    :title="t('sections.paid.title')"
    title-class="payments-ledger-section__title--paid"
  >
    <PaidRow
      v-for="member in props.members"
      :key="member.id"
      :format-age="props.formatAge"
      :format-member-name="props.formatMemberName"
      :member="member"
    />
  </BasePaymentSection>
</template>

<i18n lang="json">
{
  "pl": {
    "sections": {
      "paid": {
        "title": "Opłacili",
        "empty": "Brak opłaconych osób w tym miesiącu."
      }
    }
  },
  "en": {
    "sections": {
      "paid": {
        "title": "Paid up",
        "empty": "No paid members in this month."
      }
    }
  }
}
</i18n>
