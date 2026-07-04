<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import MemberListRow from '@/ui/components/MemberListRow.vue'
import { calculateAge } from '@/ui/utils/age'
import MemberActiveDetailsDrawer from './MemberActiveDetailsDrawer.vue'
import MemberArchivedDetailsDrawer from './MemberArchivedDetailsDrawer.vue'

type RosterMemberRowVariant = 'active' | 'archived'

const props = defineProps<{
  isOpen: boolean
  member: MemberRosterListItem
  variant: RosterMemberRowVariant
}>()

const emit = defineEmits<{
  archived: [memberId: string]
  deleted: [memberId: string]
  error: [message: string]
  saved: []
  toggle: [memberId: string]
  unarchived: [memberId: string]
}>()

const { t } = useI18n({ useScope: 'local' })

const memberName = computed(
  () => `${props.member.firstName} ${props.member.lastName}`
)
const ageLabel = computed(() => {
  const age = calculateAge(props.member.dateOfBirth)

  return age === null ? t('table.ageUnknown') : t('table.age', { age })
})
const toggleLabel = computed(() =>
  t(props.isOpen ? 'actions.closeDetailsAria' : 'actions.openDetailsAria', {
    memberName: memberName.value
  })
)

function toggleDetails() {
  emit('toggle', props.member.id)
}

function finishArchive(memberId: string) {
  emit('archived', memberId)
}

function finishDelete(memberId: string) {
  emit('deleted', memberId)
}

function finishUnarchive(memberId: string) {
  emit('unarchived', memberId)
}

function showError(message: string) {
  emit('error', message)
}
</script>

<template>
  <details class="roster-member-row" :open="props.isOpen">
    <!-- What: keep expand and collapse bound to the summary row only. Why: the details body contains edit actions and form fields that must remain tappable in this mobile-first list without collapsing on every interaction. -->
    <MemberListRow
      as="summary"
      :age-label="ageLabel"
      :aria-label="toggleLabel"
      :name="memberName"
      status-icon="expand_more"
      :status-open="props.isOpen"
      :title="toggleLabel"
      @click.prevent="toggleDetails"
    />
    <MemberActiveDetailsDrawer
      v-if="props.variant === 'active'"
      :is-open="props.isOpen"
      :member="props.member"
      @archived="finishArchive"
      @deleted="finishDelete"
      @error="showError"
      @saved="emit('saved')"
    />
    <MemberArchivedDetailsDrawer
      v-else
      :is-open="props.isOpen"
      :member="props.member"
      @error="showError"
      @unarchived="finishUnarchive"
    />
  </details>
</template>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "openDetailsAria": "Otwórz szczegóły członka {memberName}",
      "closeDetailsAria": "Zamknij szczegóły członka {memberName}"
    },
    "table": {
      "age": "Wiek {age}",
      "ageUnknown": "Wiek nieznany"
    }
  },
  "en": {
    "actions": {
      "openDetailsAria": "Open details for {memberName}",
      "closeDetailsAria": "Close details for {memberName}"
    },
    "table": {
      "age": "Age {age}",
      "ageUnknown": "Age unknown"
    }
  }
}
</i18n>
