<script setup lang="ts">
import { onBeforeUnmount, onMounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'

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
// What: generate a component-local title id for dialog labelling. Why: the extracted modal can be rendered by the view and tests without relying on one global DOM id.
const titleId = useId()

function requestClose() {
  if (props.isPending) {
    return
  }

  emit('close')
}

function requestConfirm() {
  if (props.isPending || props.session === null) {
    return
  }

  emit('confirm')
}

function dismissError() {
  emit('dismissError')
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !props.visible || props.session === null) {
    return
  }

  // What: keep keyboard dismissal with the extracted modal. Why: the history view should not know which DOM events are needed to operate the dialog shell.
  requestClose()
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<template>
  <!-- What: keep the destructive attendance overlay as a focused component. Why: the history view should own application-layer writes while the modal owns accessible presentation, dismissal, and pending-state controls. -->
  <Transition name="attendance-delete-overlay">
    <div
      v-if="props.visible && props.session"
      class="fixed inset-0 z-70 flex items-end justify-center p-4 sm:items-center"
    >
      <div
        class="attendance-delete-confirmation__backdrop"
        data-testid="attendance-delete-backdrop"
        @click="requestClose"
      ></div>
      <section
        :aria-labelledby="titleId"
        aria-modal="true"
        class="relative grid w-full max-w-lg gap-4 border border-on-surface bg-surface p-5 hard-shadow"
        role="dialog"
      >
        <p
          class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
        >
          {{ t('deleteConfirmation.eyebrow') }}
        </p>
        <h3
          :id="titleId"
          class="font-headline text-[2rem] font-bold uppercase tracking-tight"
        >
          {{ t('deleteConfirmation.title') }}
        </h3>
        <p class="text-sm leading-6 text-secondary">
          {{ t('deleteConfirmation.body') }}
        </p>

        <dl class="grid gap-3 sm:grid-cols-3">
          <div class="attendance-delete-confirmation__detail">
            <dt
              class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
            >
              {{ t('deleteConfirmation.dateLabel') }}
            </dt>
            <dd
              class="font-headline text-lg font-bold uppercase tracking-tight"
            >
              {{ props.session.dateLabel }}
            </dd>
          </div>
          <div class="attendance-delete-confirmation__detail">
            <dt
              class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
            >
              {{ t('deleteConfirmation.timeLabel') }}
            </dt>
            <dd
              class="font-headline text-lg font-bold uppercase tracking-tight"
            >
              {{ props.session.timeLabel }}
            </dd>
          </div>
          <div class="attendance-delete-confirmation__detail">
            <dt
              class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
            >
              {{ t('deleteConfirmation.attendanceLabel') }}
            </dt>
            <dd
              class="font-headline text-lg font-bold uppercase tracking-tight"
            >
              {{ props.session.attendanceLabel }}
            </dd>
          </div>
        </dl>

        <FloatingErrorAlert
          v-if="props.hasError"
          :message="t('deleteConfirmation.errors.submit')"
          :title="t('deleteConfirmation.errors.title')"
          stack-level="modal"
          top-offset="shell"
          @dismiss="dismissError"
        />

        <div
          class="attendance-delete-confirmation__actions flex flex-col gap-3 sm:flex-row sm:justify-end"
        >
          <AppButton
            :disabled="props.isPending"
            data-testid="attendance-delete-confirm"
            type="button"
            @click="requestConfirm"
          >
            {{
              props.isPending
                ? t('deleteConfirmation.actions.pending')
                : t('deleteConfirmation.actions.confirm')
            }}
          </AppButton>
          <AppButton
            :disabled="props.isPending"
            data-testid="attendance-delete-cancel"
            variant="secondary"
            type="button"
            @click="requestClose"
          >
            {{ t('deleteConfirmation.actions.cancel') }}
          </AppButton>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.attendance-delete-confirmation__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(2px);
}

.attendance-delete-confirmation__detail {
  display: grid;
  gap: 0.35rem;
  padding: 0.875rem;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container-low);
}

.attendance-delete-overlay-enter-active,
.attendance-delete-overlay-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.attendance-delete-overlay-enter-from,
.attendance-delete-overlay-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>

<i18n lang="json">
{
  "pl": {
    "deleteConfirmation": {
      "eyebrow": "Potwierdzenie",
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
      "eyebrow": "Confirmation",
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
