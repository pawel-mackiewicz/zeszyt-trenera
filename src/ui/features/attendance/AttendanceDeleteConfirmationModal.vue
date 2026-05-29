<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmationModal, {
  type ConfirmationModalDetail
} from '@/ui/components/modals/ConfirmationModal.vue'

export type AttendanceDeleteConfirmationModalSession = {
  attendanceLabel: string
  dateLabel: string
  timeLabel: string
}

const props = withDefaults(
  defineProps<{
    hasError?: boolean
    isPending?: boolean
    session: AttendanceDeleteConfirmationModalSession | null
    visible: boolean
  }>(),
  {
    hasError: false,
    isPending: false
  }
)

const emit = defineEmits<{
  close: []
  confirm: []
  dismissError: []
}>()

const { t } = useI18n({ useScope: 'local' })
const isModalVisible = computed(() => props.visible && props.session !== null)
const details = computed<ConfirmationModalDetail[]>(() => {
  if (props.session === null) {
    return []
  }

  return [
    {
      label: t('deleteConfirmation.dateLabel'),
      value: props.session.dateLabel
    },
    {
      label: t('deleteConfirmation.timeLabel'),
      value: props.session.timeLabel
    },
    {
      label: t('deleteConfirmation.attendanceLabel'),
      value: props.session.attendanceLabel
    }
  ]
})

function requestConfirm() {
  emit('confirm')
}
</script>

<template>
  <ConfirmationModal
    :visible="isModalVisible"
    :title="t('deleteConfirmation.title')"
    :body="t('deleteConfirmation.body')"
    :details="details"
    :detail-columns="3"
    :confirm-label="t('deleteConfirmation.actions.confirm')"
    :pending-label="t('deleteConfirmation.actions.pending')"
    :cancel-label="t('deleteConfirmation.actions.cancel')"
    :is-pending="props.isPending"
    :error-message="props.hasError ? t('deleteConfirmation.errors.submit') : ''"
    :error-title="props.hasError ? t('deleteConfirmation.errors.title') : ''"
    actions-class="attendance-delete-confirmation__actions"
    backdrop-test-id="attendance-delete-backdrop"
    confirm-test-id="attendance-delete-confirm"
    cancel-test-id="attendance-delete-cancel"
    detail-class="attendance-delete-confirmation__detail"
    @close="emit('close')"
    @confirm="requestConfirm"
    @dismiss-error="emit('dismissError')"
  />
</template>

<i18n lang="json">
{
  "pl": {
    "deleteConfirmation": {
      "title": "Usunąć trening?",
      "body": "Ta akcja jest nieodwracalna! Sprawdź czy na pewno usuwasz właściwy trening.",
      "dateLabel": "Data",
      "timeLabel": "Godzina",
      "attendanceLabel": "Obecność",
      "actions": {
        "confirm": "Usuń trening",
        "pending": "Usuwanie...",
        "cancel": "Anuluj"
      },
      "errors": {
        "title": "Nie udało się usunąć treningu",
        "submit": "Spróbuj ponownie. Ten ekran nie usunął jeszcze listy obecności."
      }
    }
  },
  "en": {
    "deleteConfirmation": {
      "title": "Delete this training?",
      "body": "This action is irreversible! Make sure you are deleting the correct training.",
      "dateLabel": "Date",
      "timeLabel": "Time",
      "attendanceLabel": "Attendance",
      "actions": {
        "confirm": "Delete training",
        "pending": "Deleting...",
        "cancel": "Cancel"
      },
      "errors": {
        "title": "The training could not be deleted",
        "submit": "Try again. This screen has not deleted the attendance list yet."
      }
    }
  }
}
</i18n>
