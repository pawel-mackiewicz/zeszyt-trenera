<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { MembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'

import BasePaymentSection from './BasePaymentSection.vue'
import UnpaidAttendedRow from './UnpaidAttendedRow.vue'
import type { MembershipPaymentDisplayMember } from '../membershipPaymentActions'

const props = defineProps<{
  formatAge: (member: MembershipPaymentDisplayMember) => string
  formatMemberName: (member: MembershipPaymentDisplayMember) => string
  members: MembershipPaymentStatusMemberListItem[]
}>()

const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <BasePaymentSection
    :empty-message="t('sections.unpaidAttended.empty')"
    :is-empty="props.members.length === 0"
    :title="t('sections.unpaidAttended.title')"
    title-class="payments-ledger-section__title--alert"
  >
    <UnpaidAttendedRow
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
      "unpaidAttended": {
        "title": "Obecni i nieopłacili",
        "empty": "Brak nieopłaconych osób z obecnościami w tym miesiącu."
      }
    }
  },
  "en": {
    "sections": {
      "unpaidAttended": {
        "title": "Attended and unpaid",
        "empty": "No unpaid members with attendance in this month."
      }
    }
  }
}
</i18n>
