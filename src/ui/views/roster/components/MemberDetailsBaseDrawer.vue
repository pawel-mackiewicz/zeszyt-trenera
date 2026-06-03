<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery.ts'

defineProps<{
  isOpen: boolean
  member: MemberRosterListItem
}>()

const { t } = useI18n({ useScope: 'local' })

function formatDisplayDate(val: Date | string): string {
  const date = val instanceof Date ? val : new Date(val)
  if (Number.isNaN(date.getTime())) return t('missing')
  return date.toISOString().split('T')[0]
}

function formatOptionalDisplayDate(val: Date | string | undefined): string {
  if (!val) return t('missing')
  return formatDisplayDate(val)
}

function toPhoneDialHref(phoneNumber: string): string {
  return `tel:${phoneNumber.replace(/\s+/g, '')}`
}

function toPhoneMessageHref(phoneNumber: string): string {
  return `sms:${phoneNumber.replace(/\s+/g, '')}`
}
</script>

<template>
  <div
    v-show="isOpen"
    class="p-4 bg-white/60 backdrop-blur-sm border-b border-outline-variant grid grid-cols-2 md:grid-cols-4 gap-4"
  >
    <div class="flex flex-col">
      <span class="font-label text-[0.6rem] text-secondary uppercase font-bold">
        {{ t('phoneNumber') }}
      </span>
      <div
        v-if="member.phoneNumber?.trim()"
        class="member-details-base-drawer__phone-actions"
      >
        <span class="font-mono text-sm">{{ member.phoneNumber }}</span>
        <div class="member-details-base-drawer__phone-actions-row">
          <a
            class="member-details-base-drawer__phone-action"
            :href="toPhoneDialHref(member.phoneNumber)"
            :aria-label="`${t('actions.call')} ${member.phoneNumber}`"
            :title="`${t('actions.call')} ${member.phoneNumber}`"
          >
            {{ t('actions.call') }}
          </a>
          <a
            class="member-details-base-drawer__phone-action member-details-base-drawer__phone-action--secondary"
            :href="toPhoneMessageHref(member.phoneNumber)"
            :aria-label="`${t('actions.msg')} ${member.phoneNumber}`"
            :title="`${t('actions.msg')} ${member.phoneNumber}`"
          >
            {{ t('actions.msg') }}
          </a>
        </div>
      </div>
      <span v-else class="font-mono text-sm">{{ t('missing') }}</span>
    </div>
    <div class="flex flex-col">
      <span class="font-label text-[0.6rem] text-secondary uppercase font-bold">
        {{ t('dateOfBirth') }}
      </span>
      <span class="font-mono text-sm">
        {{ formatDisplayDate(member.dateOfBirth) }}
      </span>
    </div>
    <div class="flex flex-col">
      <span class="font-label text-[0.6rem] text-secondary uppercase font-bold">
        {{ t('joinedAt') }}
      </span>
      <span class="font-mono text-sm">
        {{ formatOptionalDisplayDate(member.joinedAt) }}
      </span>
    </div>
    <div
      class="col-span-2 md:col-span-4 flex justify-end gap-3 border-t border-outline-variant pt-3"
    >
      <slot name="actions" />
    </div>
    <slot />
  </div>
</template>

<style scoped>
.member-details-base-drawer__phone-actions {
  display: grid;
  gap: 0.45rem;
}

.member-details-base-drawer__phone-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.member-details-base-drawer__phone-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  min-width: 3.5rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--color-on-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  background: var(--color-surface);
  color: var(--color-primary);
  font-family: var(--font-label);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: lowercase;
  transition:
    transform 75ms ease,
    box-shadow 75ms ease,
    background-color 75ms ease;
}

.member-details-base-drawer__phone-action--secondary {
  color: var(--color-on-surface);
  background: var(--color-surface-container-low);
}

.member-details-base-drawer__phone-action:hover {
  transform: translate(2px, 2px);
  box-shadow: none;
  background: var(--color-surface-container-low);
}

.member-details-base-drawer__phone-action:active {
  transform: scale(0.97);
  box-shadow: none;
}

.member-details-base-drawer__phone-action:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: 2px;
}
</style>

<i18n lang="json">
{
  "pl": {
    "phoneNumber": "Telefon",
    "dateOfBirth": "Data ur.",
    "joinedAt": "Dołączył",
    "missing": "Brak",
    "actions": {
      "call": "zadzwoń",
      "msg": "sms"
    }
  },
  "en": {
    "phoneNumber": "Phone",
    "dateOfBirth": "Birth date",
    "joinedAt": "Joined",
    "missing": "Missing",
    "actions": {
      "call": "call",
      "msg": "msg"
    }
  }
}
</i18n>
