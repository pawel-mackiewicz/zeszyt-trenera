<script setup lang="ts">
import AppIcon from '@/ui/components/AppIcon.vue'

type MemberListRowElement = 'button' | 'summary'
type MemberListRowStatusIcon = InstanceType<typeof AppIcon>['$props']['name']

const props = withDefaults(
  defineProps<{
    ageLabel: string
    as?: MemberListRowElement
    disabled?: boolean
    muted?: boolean
    name: string
    selected?: boolean
    statusIcon: MemberListRowStatusIcon
    statusOpen?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
    muted: false,
    selected: false,
    statusOpen: false
  }
)
</script>

<template>
  <component
    :is="props.as"
    class="member-list-row"
    :class="{
      'member-list-row--disabled': props.disabled,
      'member-list-row--muted': props.muted,
      'member-list-row--selected': props.selected,
      'member-list-row--summary': props.as === 'summary'
    }"
    :disabled="props.as === 'button' ? props.disabled : undefined"
  >
    <span class="member-list-row__identity">
      <span class="member-list-row__name">{{ props.name }}</span>
      <span class="member-list-row__age">{{ props.ageLabel }}</span>
      <span v-if="$slots.supporting" class="member-list-row__supporting">
        <slot name="supporting" />
      </span>
    </span>

    <span
      class="member-list-row__status"
      :class="{
        'member-list-row__status--muted': props.muted,
        'member-list-row__status--open': props.statusOpen,
        'member-list-row__status--selected': props.selected
      }"
    >
      <AppIcon :name="props.statusIcon" />
    </span>
  </component>
</template>

<style scoped>
.member-list-row {
  display: grid;
  align-items: center;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  border: 0;
  border-bottom: 1px solid var(--color-outline-variant);
  color: var(--color-on-surface);
  text-align: left;
  list-style: none;
  background: color-mix(in srgb, var(--color-surface) 78%, white);
  transition:
    color 200ms var(--ease-standard),
    background-color 200ms var(--ease-standard);
}

.member-list-row::-webkit-details-marker {
  display: none;
}

.member-list-row:not(.member-list-row--disabled):hover {
  background: var(--color-surface-container-low);
}

.member-list-row--selected {
  color: white;
  background: linear-gradient(
    135deg,
    rgba(174, 20, 23, 0.96),
    rgba(185, 29, 29, 0.92)
  );
}

.member-list-row--selected:not(.member-list-row--disabled):hover {
  background: linear-gradient(
    135deg,
    rgba(174, 20, 23, 1),
    rgba(185, 29, 29, 0.96)
  );
}

.member-list-row--muted {
  color: var(--color-secondary);
  background: var(--color-surface-container-low);
}

.member-list-row--disabled {
  cursor: not-allowed;
}

.member-list-row--muted.member-list-row--disabled {
  cursor: default;
}

.member-list-row--summary {
  cursor: pointer;
}

.member-list-row__identity {
  display: block;
  min-width: 0;
}

.member-list-row__name {
  display: block;
  overflow: hidden;
  font-family: var(--font-headline);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-list-row__age {
  display: block;
  margin-top: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.2;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.member-list-row__supporting {
  display: block;
  margin-top: 0.45rem;
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.member-list-row__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--color-secondary);
  opacity: 0.84;
}

.member-list-row__status--selected {
  color: white;
  opacity: 0.84;
}

.member-list-row__status--muted {
  color: var(--color-secondary);
  opacity: 0.84;
}

.member-list-row__status :deep(.app-icon) {
  transition: transform 200ms var(--ease-standard);
}

.member-list-row__status--open :deep(.app-icon) {
  transform: rotate(180deg);
}
</style>
