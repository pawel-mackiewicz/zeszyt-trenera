<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import DeleteIconButton from '@/ui/components/DeleteIconButton.vue'
import ConfirmationModal, {
  type ConfirmationModalDetail
} from '@/ui/components/modals/ConfirmationModal.vue'
import MemberEditDrawer from '@/ui/features/roster/MemberEditDrawer.vue'

const props = defineProps<{
  isOpen: boolean
  member: MemberRosterListItem
}>()

const emit = defineEmits<{
  deleted: [memberId: string]
  error: [message: string]
  saved: [member: MemberRosterListItem]
}>()

const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })
const isEditing = ref(false)
const deleteModalMode = ref<'confirm' | 'attendance-blocked' | null>(null)
const isDeletingMember = ref(false)
const deleteFailed = ref(false)
const attendanceBlockerCount = ref(0)

const memberDisplayName = computed(
  () => `${props.member.firstName} ${props.member.lastName}`
)
const deleteModalDetails = computed<ConfirmationModalDetail[]>(() => [
  {
    label: t('deleteConfirmation.details.member'),
    value: memberDisplayName.value
  },
  {
    label: t('dateOfBirth'),
    value: formatDisplayDate(props.member.dateOfBirth)
  }
])
const deleteModalTitle = computed(() =>
  deleteModalMode.value === 'attendance-blocked'
    ? t('deleteAttendanceBlocked.title')
    : t('deleteConfirmation.title')
)
const deleteModalBody = computed(() =>
  deleteModalMode.value === 'attendance-blocked'
    ? t('deleteAttendanceBlocked.body', { count: attendanceBlockerCount.value })
    : t('deleteConfirmation.body')
)
const deleteModalConfirmLabel = computed(() =>
  deleteModalMode.value === 'attendance-blocked'
    ? t('deleteAttendanceBlocked.actions.confirm')
    : t('deleteConfirmation.actions.confirm')
)
const deleteModalErrorMessage = computed(() =>
  deleteFailed.value ? t('deleteConfirmation.errors.submit') : ''
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      isEditing.value = false
      resetDeleteState()
      emit('error', '')
    }
  }
)

watch(
  () => props.member.id,
  () => {
    isEditing.value = false
    resetDeleteState()
    emit('error', '')
  }
)

function resetDeleteState() {
  deleteModalMode.value = null
  isDeletingMember.value = false
  deleteFailed.value = false
  attendanceBlockerCount.value = 0
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

function openDeleteConfirmation() {
  if (isDeletingMember.value) {
    return
  }

  emit('error', '')
  deleteFailed.value = false
  attendanceBlockerCount.value = 0
  deleteModalMode.value = 'confirm'
}

function closeDeleteModal() {
  if (isDeletingMember.value) {
    return
  }

  resetDeleteState()
}

function dismissDeleteError() {
  deleteFailed.value = false
}

async function confirmDeleteMember() {
  if (deleteModalMode.value === 'attendance-blocked') {
    closeDeleteModal()
    return
  }

  if (deleteModalMode.value !== 'confirm' || isDeletingMember.value) {
    return
  }

  isDeletingMember.value = true
  deleteFailed.value = false
  emit('error', '')

  try {
    // What: member removal stays behind the application use case. Why: the UI must preserve tombstone events, dependency checks, and unit-of-work semantics.
    const result = await useCases.deleteMember.handle({
      memberId: props.member.id
    })

    if (result.membershipPaymentIds.length > 0) {
      resetDeleteState()
      emit('error', t('deleteConfirmation.errors.hasPayments'))
      return
    }

    if (result.attendanceListIds.length > 0) {
      isDeletingMember.value = false
      attendanceBlockerCount.value = result.attendanceListIds.length
      deleteModalMode.value = 'attendance-blocked'
      return
    }

    if (result.deleted) {
      resetDeleteState()
      emit('deleted', props.member.id)
      return
    }

    deleteFailed.value = true
  } catch (error) {
    deleteFailed.value = true
    console.error('Failed to delete member from roster details', error)
  } finally {
    isDeletingMember.value = false
  }
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
        @click="startEditing"
      >
        {{ t('actions.openEdit') }}
      </AppButton>
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
        :disabled="isDeletingMember"
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
    <ConfirmationModal
      :body="deleteModalBody"
      :cancel-label="t('deleteConfirmation.actions.cancel')"
      cancel-test-id="member-delete-cancel"
      :confirm-label="deleteModalConfirmLabel"
      confirm-test-id="member-delete-confirm"
      :details="deleteModalDetails"
      :error-message="deleteModalErrorMessage"
      :error-title="t('deleteConfirmation.errors.title')"
      :hide-cancel="deleteModalMode === 'attendance-blocked'"
      :is-pending="isDeletingMember"
      :pending-label="t('deleteConfirmation.actions.pending')"
      :title="deleteModalTitle"
      :visible="deleteModalMode !== null"
      backdrop-test-id="member-delete-backdrop"
      @close="closeDeleteModal"
      @confirm="confirmDeleteMember"
      @dismiss-error="dismissDeleteError"
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
      "deleteMemberAria": "Usuń członka {name}",
      "openEdit": "Edytuj"
    },
    "deleteConfirmation": {
      "title": "Usunąć członka?",
      "body": "Ta akcja usunie członka z rejestru. Nie da się jej cofnąć.",
      "details": {
        "member": "Członek"
      },
      "actions": {
        "confirm": "Usuń",
        "pending": "Usuwanie...",
        "cancel": "Anuluj"
      },
      "errors": {
        "title": "Nie udało się usunąć",
        "submit": "Spróbuj ponownie. Członek nie został usunięty.",
        "hasPayments": "Nie możesz usunąć członka, który ma zapisane płatności."
      }
    },
    "deleteAttendanceBlocked": {
      "title": "Najpierw usuń z treningów",
      "body": "Ten członek występuje na {count} listach obecności. Usuń go ze wszystkich treningów, zanim usuniesz go z rejestru.",
      "actions": {
        "confirm": "Rozumiem"
      }
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
      "deleteMemberAria": "Delete member {name}",
      "openEdit": "Edit"
    },
    "deleteConfirmation": {
      "title": "Delete member?",
      "body": "This will remove the member from the roster. This action cannot be undone.",
      "details": {
        "member": "Member"
      },
      "actions": {
        "confirm": "Delete",
        "pending": "Deleting...",
        "cancel": "Cancel"
      },
      "errors": {
        "title": "Delete failed",
        "submit": "Try again. The member was not deleted.",
        "hasPayments": "You cannot delete a member who has recorded payments."
      }
    },
    "deleteAttendanceBlocked": {
      "title": "Remove from trainings first",
      "body": "This member is still present on {count} attendance lists. Remove them from all trainings before deleting them from the roster.",
      "actions": {
        "confirm": "OK"
      }
    }
  }
}
</i18n>
