<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import AppIcon from '@/ui/components/AppIcon.vue'
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
    <summary
      class="roster-member-row__summary"
      :aria-label="toggleLabel"
      :title="toggleLabel"
      @click.prevent="toggleDetails"
    >
      <span class="roster-member-row__identity">
        <span class="roster-member-row__name">{{ memberName }}</span>
      </span>
      <AppIcon
        class="roster-member-row__expand-icon"
        :class="{ 'roster-member-row__expand-icon--open': props.isOpen }"
        name="expand_more"
      />
    </summary>
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

<style scoped>
.roster-member-row__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--color-outline-variant);
  cursor: pointer;
  list-style: none;
  transition: background-color 200ms var(--ease-standard);
}

.roster-member-row__summary::-webkit-details-marker {
  display: none;
}

.roster-member-row__summary:hover {
  background: var(--color-surface-container-low);
}

.roster-member-row__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.roster-member-row__name {
  overflow: hidden;
  font-family: var(--font-headline);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-on-surface);
  transition: color 200ms var(--ease-standard);
}

.roster-member-row__summary:hover .roster-member-row__name {
  color: var(--color-primary);
}

.roster-member-row__expand-icon {
  flex: 0 0 auto;
  color: var(--color-secondary);
  transition: transform 200ms var(--ease-standard);
}

.roster-member-row__expand-icon--open {
  transform: rotate(180deg);
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "openDetailsAria": "Otwórz szczegóły członka {memberName}",
      "closeDetailsAria": "Zamknij szczegóły członka {memberName}"
    }
  },
  "en": {
    "actions": {
      "openDetailsAria": "Open details for {memberName}",
      "closeDetailsAria": "Close details for {memberName}"
    }
  }
}
</i18n>
