<script setup lang="ts">
import AppIcon from '@/ui/components/AppIcon.vue'
import type { CampParticipantCandidateViewItem } from '@/ui/views/camps/useCampParticipantCandidates'

const props = defineProps<{
  addLabel: string
  formatAge: (age: number) => string
  member: CampParticipantCandidateViewItem
  signedButtonLabel: string
  signedLabel: string
}>()

const emit = defineEmits<{
  select: [member: CampParticipantCandidateViewItem]
}>()

function selectMember() {
  if (!props.member.alreadySigned) {
    emit('select', props.member)
  }
}
</script>

<template>
  <li
    class="camp-participant-candidate-row grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-outline-variant px-4 py-4 text-left transition-colors"
    :class="{
      'camp-participant-candidate-row--signed': member.alreadySigned
    }"
    :aria-disabled="member.alreadySigned"
    :tabindex="member.alreadySigned ? -1 : 0"
    role="button"
    @click="selectMember"
    @keydown.enter.prevent="selectMember"
    @keydown.space.prevent="selectMember"
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
        {{ formatAge(member.age) }}
      </span>
      <span
        v-if="member.alreadySigned"
        class="camp-participant-candidate-row__signed-label"
      >
        {{ signedLabel }}
      </span>
    </span>

    <span class="flex items-center justify-end" @click.stop>
      <button
        class="camp-participant-candidate-row__status"
        :class="{
          'camp-participant-candidate-row__status--signed': member.alreadySigned
        }"
        :disabled="member.alreadySigned"
        type="button"
        :aria-label="member.alreadySigned ? signedButtonLabel : addLabel"
        :title="member.alreadySigned ? signedButtonLabel : addLabel"
        @click.stop="selectMember"
      >
        <AppIcon v-if="member.alreadySigned" name="check_circle" />
        <AppIcon v-else name="add" />
      </button>
    </span>
  </li>
</template>

<style scoped>
.camp-participant-candidate-row {
  background: color-mix(in srgb, var(--color-surface) 78%, white);
  cursor: pointer;
}

.camp-participant-candidate-row:hover {
  background: var(--color-surface-container-low);
}

.camp-participant-candidate-row--signed {
  color: var(--color-secondary);
  cursor: default;
  background: var(--color-surface-container-low);
}

.camp-participant-candidate-row__signed-label {
  display: block;
  margin-top: 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--color-primary);
}

.camp-participant-candidate-row__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgba(16, 59, 55, 0.18);
  color: var(--color-primary);
  background: rgba(255, 255, 255, 0.7);
}

.camp-participant-candidate-row__status:not(:disabled) {
  cursor: pointer;
}

.camp-participant-candidate-row__status:not(:disabled):hover {
  background: var(--color-surface-container-low);
}

.camp-participant-candidate-row__status:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: 3px;
}

.camp-participant-candidate-row__status--signed {
  border-color: rgba(16, 59, 55, 0.18);
  color: var(--color-secondary);
  background: rgba(255, 255, 255, 0.7);
  opacity: 1;
}
</style>
