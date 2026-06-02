<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import AppButton from '@/ui/components/AppButton.vue'
import ArchiveIconButton from '@/ui/components/ArchiveIconButton.vue'
import DeleteIconButton from '@/ui/components/DeleteIconButton.vue'
import MemberArchiveConfirmationModal from '@/ui/features/roster/MemberArchiveConfirmationModal.vue'
import MemberDeleteConfirmationModal from '@/ui/features/roster/MemberDeleteConfirmationModal.vue'
import MemberEditDrawer from '@/ui/features/roster/MemberEditDrawer.vue'

const props = defineProps<{
  isOpen: boolean
  member: MemberRosterListItem
}>()

const emit = defineEmits<{
  deleted: [memberId: string]
  archived: [memberId: string]
  error: [message: string]
  saved: [member: MemberRosterListItem]
}>()

const { t } = useI18n({ useScope: 'local' })
const isEditing = ref(false)
const archiveModalVisible = ref(false)
const deleteModalVisible = ref(false)
const isArchivingMember = ref(false)
const isDeletingMember = ref(false)

const memberDisplayName = computed(
  () => `${props.member.firstName} ${props.member.lastName}`
)
const memberActionDisabled = computed(
  () =>
    isArchivingMember.value ||
    isDeletingMember.value ||
    archiveModalVisible.value ||
    deleteModalVisible.value
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      isEditing.value = false
      resetArchiveState()
      resetDeleteState()
      emit('error', '')
    }
  }
)

watch(
  () => props.member.id,
  () => {
    isEditing.value = false
    resetArchiveState()
    resetDeleteState()
    emit('error', '')
  }
)

function resetArchiveState() {
  archiveModalVisible.value = false
  isArchivingMember.value = false
}

function resetDeleteState() {
  deleteModalVisible.value = false
  isDeletingMember.value = false
}

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
  // What: convert roster phone text into a dialable URI before rendering. Why: inline edit previews can keep spacing while mobile call intents require a compact tel target.
  return `tel:${phoneNumber.replace(/\s+/g, '')}`
}

function toPhoneMessageHref(phoneNumber: string): string {
  // What: convert roster phone text into a message URI before rendering. Why: the member list should offer a direct SMS path beside calling without forcing users to retype numbers on mobile.
  return `sms:${phoneNumber.replace(/\s+/g, '')}`
}

function startEditing() {
  emit('error', '')
  resetArchiveState()
  resetDeleteState()
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  emit('error', '')
}

function finishMemberEdit(updatedMember: MemberRosterListItem) {
  isEditing.value = false
  emit('error', '')
  emit('saved', updatedMember)
}

function openArchiveConfirmation() {
  if (
    isArchivingMember.value ||
    isDeletingMember.value ||
    archiveModalVisible.value ||
    deleteModalVisible.value
  ) {
    return
  }

  emit('error', '')
  resetDeleteState()
  archiveModalVisible.value = true
}

function closeArchiveModal() {
  resetArchiveState()
}

function openDeleteConfirmation() {
  if (
    isDeletingMember.value ||
    isArchivingMember.value ||
    archiveModalVisible.value ||
    deleteModalVisible.value
  ) {
    return
  }

  emit('error', '')
  resetArchiveState()
  deleteModalVisible.value = true
}

function closeDeleteModal() {
  resetDeleteState()
}

function finishArchiveMember(memberId: string) {
  resetArchiveState()
  emit('archived', memberId)
}

function finishDeleteMember(memberId: string) {
  resetDeleteState()
  emit('deleted', memberId)
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
      <!-- What: split phone contact into two explicit actions: call and msg. Why: the roster should expose both common outreach paths as immediate taps instead of hiding one behind manual copy or context menus. -->
      <div
        v-if="member.phoneNumber?.trim()"
        class="member-details-drawer__phone-actions"
      >
        <span class="font-mono text-sm">{{ member.phoneNumber }}</span>
        <div class="member-details-drawer__phone-actions-row">
          <a
            class="member-details-drawer__phone-action"
            :href="toPhoneDialHref(member.phoneNumber)"
            :aria-label="`${t('actions.call')} ${member.phoneNumber}`"
            :title="`${t('actions.call')} ${member.phoneNumber}`"
          >
            {{ t('actions.call') }}
          </a>
          <a
            class="member-details-drawer__phone-action member-details-drawer__phone-action--secondary"
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
      <!-- What: inline member actions now reuse the shared AppButton primitive. Why: edit flows should inherit the same tap targets and state styling as the rest of this mobile-first PWA instead of shipping view-specific button markup. -->
      <AppButton
        v-if="!isEditing"
        variant="secondary"
        type="button"
        :disabled="memberActionDisabled"
        @click="startEditing"
      >
        {{ t('actions.openEdit') }}
      </AppButton>
      <ArchiveIconButton
        v-if="!isEditing"
        data-testid="member-archive-open"
        :disabled="
          isArchivingMember ||
          isDeletingMember ||
          archiveModalVisible ||
          deleteModalVisible
        "
        :aria-label="
          t('actions.archiveMemberAria', {
            name: memberDisplayName
          })
        "
        :title="
          t('actions.archiveMemberAria', {
            name: memberDisplayName
          })
        "
        @click="openArchiveConfirmation"
      />
      <DeleteIconButton
        v-if="!isEditing"
        data-testid="member-delete-open"
        :aria-label="
          t('actions.deleteMemberAria', {
            name: memberDisplayName
          })
        "
        :title="
          t('actions.deleteMemberAria', {
            name: memberDisplayName
          })
        "
        :disabled="
          isDeletingMember ||
          isArchivingMember ||
          archiveModalVisible ||
          deleteModalVisible
        "
        @click="openDeleteConfirmation"
      />
    </div>
    <MemberEditDrawer
      :is-open="isEditing"
      :member="member"
      @cancel="cancelEditing"
      @error="emit('error', $event)"
      @saved="finishMemberEdit"
    />
    <MemberDeleteConfirmationModal
      :member="member"
      :visible="deleteModalVisible"
      @close="closeDeleteModal"
      @deleted="finishDeleteMember"
      @error="emit('error', $event)"
      @pending-change="isDeletingMember = $event"
    />
    <MemberArchiveConfirmationModal
      :member="member"
      :visible="archiveModalVisible"
      @archived="finishArchiveMember"
      @close="closeArchiveModal"
      @error="emit('error', $event)"
      @pending-change="isArchivingMember = $event"
    />
  </div>
</template>

<style scoped>
.member-details-drawer__phone-actions {
  display: grid;
  gap: 0.45rem;
}

.member-details-drawer__phone-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.member-details-drawer__phone-action {
  /* What: style call and msg as compact tactile buttons in one shared recipe. Why: these sibling actions should read as a deliberate pair and stay obvious targets in dense mobile roster rows. */
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

.member-details-drawer__phone-action--secondary {
  color: var(--color-on-surface);
  background: var(--color-surface-container-low);
}

.member-details-drawer__phone-action:hover {
  transform: translate(2px, 2px);
  box-shadow: none;
  background: var(--color-surface-container-low);
}

.member-details-drawer__phone-action:active {
  transform: scale(0.97);
  box-shadow: none;
}

.member-details-drawer__phone-action:focus-visible {
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
      "msg": "sms",
      "archiveMemberAria": "Zarchiwizuj członka {name}",
      "deleteMemberAria": "Usuń członka {name}",
      "openEdit": "Edytuj"
    }
  },
  "en": {
    "phoneNumber": "Phone",
    "dateOfBirth": "Birth date",
    "joinedAt": "Joined",
    "missing": "Missing",
    "actions": {
      "call": "call",
      "msg": "msg",
      "archiveMemberAria": "Archive member {name}",
      "deleteMemberAria": "Delete member {name}",
      "openEdit": "Edit"
    }
  }
}
</i18n>
