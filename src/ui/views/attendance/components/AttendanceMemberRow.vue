<script setup lang="ts">
import { computed } from 'vue'

import type { AttendanceEditorMemberListItem } from '@/read/ListMembersForAttendanceEditorQuery'
import AppIcon from '@/ui/components/AppIcon.vue'

const props = defineProps<{
  disabled?: boolean
  formatAge: (member: AttendanceEditorMemberListItem) => string
  member: AttendanceEditorMemberListItem
  selected: boolean
}>()

const emit = defineEmits<{
  toggle: [memberId: string]
}>()

const ageLabel = computed(() => props.formatAge(props.member))

function toggleMember() {
  emit('toggle', props.member.id)
}
</script>

<template>
  <button
    class="attendance-member-row grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-outline-variant px-4 py-4 text-left transition-colors"
    :disabled="disabled"
    :class="{
      'attendance-member-row--selected': selected
    }"
    type="button"
    @click="toggleMember"
  >
    <span class="block min-w-0">
      <span
        class="block truncate font-headline text-xl font-bold uppercase tracking-tight"
      >
        {{ member.firstName }} {{ member.lastName }}
      </span>
      <span
        class="mt-1 block font-mono text-[0.6875rem] uppercase tracking-[0.16em]"
      >
        {{ ageLabel }}
      </span>
    </span>

    <span class="flex items-center justify-end">
      <span
        v-if="selected"
        class="attendance-member-row__status attendance-member-row__status--selected"
      >
        <AppIcon name="check_circle" />
      </span>
      <span v-else class="attendance-member-row__status">
        <AppIcon name="add" />
      </span>
    </span>
  </button>
</template>

<style scoped>
.attendance-member-row {
  background: color-mix(in srgb, var(--color-surface) 78%, white);
}

.attendance-member-row:hover {
  background: var(--color-surface-container-low);
}

.attendance-member-row--selected {
  background: linear-gradient(
    135deg,
    rgba(174, 20, 23, 0.96),
    rgba(185, 29, 29, 0.92)
  );
  color: white;
}

.attendance-member-row--selected:hover {
  background: linear-gradient(
    135deg,
    rgba(174, 20, 23, 1),
    rgba(185, 29, 29, 0.96)
  );
}

.attendance-member-row__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgba(16, 59, 55, 0.18);
  color: var(--color-primary);
  background: rgba(255, 255, 255, 0.7);
}

.attendance-member-row__status--selected {
  border-color: rgba(255, 255, 255, 0.35);
  color: white;
  background: rgba(255, 255, 255, 0.1);
}
</style>
