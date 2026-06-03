<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import { useAppServices } from '@/ui/appServices'
import ConfirmationModal, {
  type ConfirmationModalDetail
} from '@/ui/components/modals/ConfirmationModal.vue'

const props = defineProps<{
  member: MemberRosterListItem
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  deleted: [memberId: string]
  error: [message: string]
  'pending-change': [isPending: boolean]
}>()

const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })
const mode = ref<'confirm' | 'attendance-blocked'>('confirm')
const isPending = ref(false)
const failed = ref(false)
const attendanceBlockerCount = ref(0)

const memberDisplayName = computed(
  () => `${props.member.firstName} ${props.member.lastName}`
)
const details = computed<ConfirmationModalDetail[]>(() => [
  {
    label: t('details.member'),
    value: memberDisplayName.value
  },
  {
    label: t('dateOfBirth'),
    value: formatDisplayDate(props.member.dateOfBirth)
  }
])
const title = computed(() =>
  mode.value === 'attendance-blocked'
    ? t('attendanceBlocked.title')
    : t('title')
)
const body = computed(() =>
  mode.value === 'attendance-blocked'
    ? t('attendanceBlocked.body', { count: attendanceBlockerCount.value })
    : t('body')
)
const confirmLabel = computed(() =>
  mode.value === 'attendance-blocked'
    ? t('attendanceBlocked.actions.confirm')
    : t('actions.confirm')
)
const errorMessage = computed(() => (failed.value ? t('errors.submit') : ''))

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      resetState()
    }
  }
)

function resetState() {
  mode.value = 'confirm'
  failed.value = false
  attendanceBlockerCount.value = 0
  setPending(false)
}

function formatDisplayDate(val: Date | string): string {
  const date = val instanceof Date ? val : new Date(val)
  if (Number.isNaN(date.getTime())) return t('missing')
  return date.toISOString().split('T')[0]
}

function setPending(nextPending: boolean) {
  isPending.value = nextPending
  emit('pending-change', nextPending)
}

function closeModal() {
  if (isPending.value) {
    return
  }

  resetState()
  emit('close')
}

function dismissError() {
  failed.value = false
}

async function confirmDeleteMember() {
  if (mode.value === 'attendance-blocked') {
    closeModal()
    return
  }

  if (!props.visible || isPending.value) {
    return
  }

  setPending(true)
  failed.value = false
  emit('error', '')

  try {
    // What: member removal stays behind the application use case. Why: the UI must preserve tombstone events, dependency checks, and unit-of-work semantics.
    const result = await useCases.deleteMember.handle({
      memberId: props.member.id
    })

    if (result.membershipPaymentIds.length > 0) {
      resetState()
      emit('error', t('errors.hasPayments'))
      emit('close')
      return
    }

    if (result.attendanceListIds.length > 0) {
      attendanceBlockerCount.value = result.attendanceListIds.length
      mode.value = 'attendance-blocked'
      return
    }

    if (result.deleted) {
      resetState()
      emit('deleted', props.member.id)
      return
    }

    failed.value = true
  } catch (error) {
    failed.value = true
    console.error('Failed to delete member from roster details', error)
  } finally {
    setPending(false)
  }
}
</script>

<template>
  <ConfirmationModal
    :body="body"
    :cancel-label="t('actions.cancel')"
    cancel-test-id="member-delete-cancel"
    :confirm-label="confirmLabel"
    confirm-test-id="member-delete-confirm"
    :details="details"
    :error-message="errorMessage"
    :error-title="t('errors.title')"
    :hide-cancel="mode === 'attendance-blocked'"
    :is-pending="isPending"
    :pending-label="t('actions.pending')"
    :title="title"
    :visible="visible"
    backdrop-test-id="member-delete-backdrop"
    @close="closeModal"
    @confirm="confirmDeleteMember"
    @dismiss-error="dismissError"
  />
</template>

<i18n lang="json">
{
  "pl": {
    "dateOfBirth": "Data ur.",
    "missing": "Brak",
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
    },
    "attendanceBlocked": {
      "title": "Najpierw usuń z treningów",
      "body": "Ten członek występuje na {count} listach obecności. Usuń go ze wszystkich treningów, zanim usuniesz go z rejestru.",
      "actions": {
        "confirm": "Rozumiem"
      }
    }
  },
  "en": {
    "dateOfBirth": "Birth date",
    "missing": "Missing",
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
    },
    "attendanceBlocked": {
      "title": "Remove from trainings first",
      "body": "This member is still present on {count} attendance lists. Remove them from all trainings before deleting them from the roster.",
      "actions": {
        "confirm": "OK"
      }
    }
  }
}
</i18n>
