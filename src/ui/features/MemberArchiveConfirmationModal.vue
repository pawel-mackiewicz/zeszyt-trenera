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
  archived: [memberId: string]
  close: []
  error: [message: string]
  'pending-change': [isPending: boolean]
}>()

const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })
const isPending = ref(false)
const failed = ref(false)

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
const errorMessage = computed(() => (failed.value ? t('errors.submit') : ''))

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      failed.value = false
      setPending(false)
    }
  }
)

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

  failed.value = false
  emit('close')
}

function dismissError() {
  failed.value = false
}

async function confirmArchiveMember() {
  if (!props.visible || isPending.value) {
    return
  }

  setPending(true)
  failed.value = false

  try {
    // What: archive writes stay behind the application use case. Why: roster UI must preserve local-first event and persistence semantics.
    await useCases.archiveMember.handle({
      memberId: props.member.id
    })

    failed.value = false
    emit('error', '')
    emit('archived', props.member.id)
  } catch (error) {
    failed.value = true
    console.error('Failed to archive member from roster details', error)
  } finally {
    setPending(false)
  }
}
</script>

<template>
  <ConfirmationModal
    :body="t('body')"
    :cancel-label="t('actions.cancel')"
    cancel-test-id="member-archive-cancel"
    :confirm-label="t('actions.confirm')"
    confirm-test-id="member-archive-confirm"
    :details="details"
    :error-message="errorMessage"
    :error-title="t('errors.title')"
    :is-pending="isPending"
    :pending-label="t('actions.pending')"
    :title="t('title')"
    :visible="visible"
    backdrop-test-id="member-archive-backdrop"
    @close="closeModal"
    @confirm="confirmArchiveMember"
    @dismiss-error="dismissError"
  />
</template>

<i18n lang="json">
{
  "pl": {
    "dateOfBirth": "Data ur.",
    "missing": "Brak",
    "title": "Zarchiwizować członka?",
    "body": "Ta akcja przeniesie członka do archiwum. Będzie można go przywrócić później.",
    "details": {
      "member": "Członek"
    },
    "actions": {
      "confirm": "Archiwizuj",
      "pending": "Archiwizowanie...",
      "cancel": "Anuluj"
    },
    "errors": {
      "title": "Nie udało się zarchiwizować",
      "submit": "Spróbuj ponownie. Członek nie został zarchiwizowany."
    }
  },
  "en": {
    "dateOfBirth": "Birth date",
    "missing": "Missing",
    "title": "Archive member?",
    "body": "This will move the member to the archived roster. You can restore them later.",
    "details": {
      "member": "Member"
    },
    "actions": {
      "confirm": "Archive",
      "pending": "Archiving...",
      "cancel": "Cancel"
    },
    "errors": {
      "title": "Archive failed",
      "submit": "Try again. The member was not archived."
    }
  }
}
</i18n>
