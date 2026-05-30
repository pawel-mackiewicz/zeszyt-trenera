<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { MembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'

import BasePaymentSection from './BasePaymentSection.vue'
import UnpaidAbsentRow from './UnpaidAbsentRow.vue'
import type { MembershipPaymentDisplayMember } from './membershipPaymentActions'

const props = defineProps<{
  formatAge: (member: MembershipPaymentDisplayMember) => string
  formatMemberName: (member: MembershipPaymentDisplayMember) => string
  members: MembershipPaymentStatusMemberListItem[]
}>()

const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <BasePaymentSection
    :empty-message="t('sections.unpaidAbsent.empty')"
    :is-empty="props.members.length === 0"
    :title="t('sections.unpaidAbsent.title')"
    title-class="payments-ledger-section__title--quiet"
  >
    <UnpaidAbsentRow
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
      "unpaidAbsent": {
        "title": "Nieobecni i nieopłacili",
        "empty": "Brak nieopłaconych nieobecnych w tym miesiącu."
      }
    }
  },
  "en": {
    "sections": {
      "unpaidAbsent": {
        "title": "Absent and unpaid",
        "empty": "No unpaid absent members in this month."
      }
    }
  }
}
</i18n>
