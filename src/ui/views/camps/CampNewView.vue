<script setup lang="ts">
import { Banknote, CalendarDays, NotebookPen, Tag } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import { useRegisterCamp } from '@/ui/views/camps/useRegisterCamp'

const messages = {
  pl: {
    sections: {
      details: 'Dane obozu',
      dates: 'Data',
      finance: 'Koszt'
    },
    fields: {
      name: {
        label: 'Nazwa obozu',
        placeholder: 'Przykład: Obóz zimowy'
      },
      startDate: {
        label: 'Data rozpoczęcia'
      },
      finishDate: {
        label: 'Data zakończenia'
      },
      price: {
        label: 'Koszt obozu',
        placeholder: 'Przykład: 2000'
      },
      note: {
        label: 'Notatki',
        placeholder: 'Przykład: transport, sprzęt, uwagi dla grupy'
      }
    },
    actions: {
      save: 'Zapisz',
      saving: 'Zapisywanie'
    },
    errors: {
      required: 'Uzupełnij wymagane pola.',
      invalidName: 'Podaj poprawną nazwę obozu.',
      invalidStartDate: 'Podaj poprawną datę rozpoczęcia.',
      invalidFinishDate:
        'Data zakończenia musi być późniejsza niż data rozpoczęcia.',
      invalidPrice: 'Podaj poprawny koszt obozu w PLN.',
      submit: 'Nie udało się zapisać obozu.'
    }
  },
  en: {
    sections: {
      details: 'Camp details',
      dates: 'Date',
      finance: 'Cost'
    },
    fields: {
      name: {
        label: 'Camp name',
        placeholder: 'Example: Winter camp'
      },
      startDate: {
        label: 'Start date'
      },
      finishDate: {
        label: 'Finish date'
      },
      price: {
        label: 'Camp cost',
        placeholder: 'Example: 2000'
      },
      note: {
        label: 'Notes',
        placeholder: 'Example: transport, equipment, group notes'
      }
    },
    actions: {
      save: 'Save',
      saving: 'Saving'
    },
    errors: {
      required: 'Complete the required fields.',
      invalidName: 'Enter a valid camp name.',
      invalidStartDate: 'Enter a valid start date.',
      invalidFinishDate: 'The finish date must be after the start date.',
      invalidPrice: 'Enter a valid camp cost in PLN.',
      submit: 'The camp could not be saved.'
    }
  }
} as const

const { t } = useI18n({
  useScope: 'local',
  messages
})
const {
  canSubmit,
  clearSubmitError,
  form,
  isSubmitting,
  submit,
  submitErrorKey
} = useRegisterCamp()
const submitError = computed(() =>
  submitErrorKey.value === null ? '' : t(`errors.${submitErrorKey.value}`)
)
</script>

<template>
  <main class="camp-new-view">
    <FloatingErrorAlert
      v-if="submitError"
      :message="submitError"
      top-offset="shell"
      @dismiss="clearSubmitError"
    />

    <form class="camp-new-view__form" @submit.prevent="submit">
      <div class="app-section-label camp-new-view__ledger-label">
        {{ t('sections.details') }}
      </div>

      <div class="camp-new-view__body">
        <div class="camp-new-view__field">
          <label class="app-section-label camp-new-view__label" for="campName">
            <Tag class="camp-new-view__label-icon" aria-hidden="true" />
            {{ t('fields.name.label') }}
            <span class="camp-new-view__required" aria-hidden="true">*</span>
          </label>
          <input
            id="campName"
            v-model="form.name"
            autocomplete="off"
            class="camp-new-view__control"
            :placeholder="t('fields.name.placeholder')"
            required
            type="text"
          />
        </div>

        <div class="camp-new-view__grid">
          <div class="camp-new-view__field">
            <label
              class="app-section-label camp-new-view__label"
              for="campStartDate"
            >
              <CalendarDays
                class="camp-new-view__label-icon"
                aria-hidden="true"
              />
              {{ t('fields.startDate.label') }}
              <span class="camp-new-view__required" aria-hidden="true">*</span>
            </label>
            <input
              id="campStartDate"
              v-model="form.startDate"
              class="camp-new-view__control"
              required
              type="date"
            />
          </div>
          <div class="camp-new-view__field">
            <label
              class="app-section-label camp-new-view__label"
              for="campFinishDate"
            >
              <CalendarDays
                class="camp-new-view__label-icon"
                aria-hidden="true"
              />
              {{ t('fields.finishDate.label') }}
              <span class="camp-new-view__required" aria-hidden="true">*</span>
            </label>
            <input
              id="campFinishDate"
              v-model="form.finishDate"
              class="camp-new-view__control"
              required
              type="date"
            />
          </div>
        </div>

        <div class="camp-new-view__field">
          <label class="app-section-label camp-new-view__label" for="campPrice">
            <Banknote class="camp-new-view__label-icon" aria-hidden="true" />
            {{ t('fields.price.label') }}
            <span class="camp-new-view__currency">PLN</span>
            <span class="camp-new-view__required" aria-hidden="true">*</span>
          </label>
          <input
            id="campPrice"
            v-model="form.price"
            class="camp-new-view__control"
            inputmode="decimal"
            :placeholder="t('fields.price.placeholder')"
            required
            type="text"
          />
        </div>

        <div class="camp-new-view__field">
          <label class="app-section-label camp-new-view__label" for="campNote">
            <NotebookPen class="camp-new-view__label-icon" aria-hidden="true" />
            {{ t('fields.note.label') }}
          </label>
          <textarea
            id="campNote"
            v-model="form.note"
            class="camp-new-view__control camp-new-view__textarea"
            :placeholder="t('fields.note.placeholder')"
          ></textarea>
        </div>

        <div class="camp-new-view__actions">
          <AppButton
            class="camp-new-view__submit"
            :disabled="!canSubmit"
            type="submit"
            variant="secondary"
          >
            {{ isSubmitting ? t('actions.saving') : t('actions.save') }}
          </AppButton>
        </div>
      </div>
    </form>
  </main>
</template>

<style scoped>
.camp-new-view {
  min-height: 100%;
  padding: 2rem 1rem 0;
}

.camp-new-view__form {
  max-width: 42rem;
  margin: 0 auto;
}

.camp-new-view__form {
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 0 var(--color-on-surface);
}

.camp-new-view__ledger-label {
  margin: 0;
  padding: 0.9rem 1rem;
  border-block-end: 1px solid var(--color-on-surface);
  background: var(--color-on-surface);
  color: var(--color-on-primary);
  font-size: 0.875rem;
}

.camp-new-view__body {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem 1rem;
}

.camp-new-view__grid {
  display: grid;
  gap: 1.5rem;
}

.camp-new-view__field {
  display: grid;
  gap: 0.5rem;
}

.camp-new-view__label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78125rem;
  color: var(--color-on-surface);
}

.camp-new-view__label-icon {
  flex: 0 0 auto;
  width: 0.9rem;
  height: 0.9rem;
  color: var(--color-secondary);
  stroke-width: 2.25;
}

.camp-new-view__required {
  color: var(--color-danger);
}

.camp-new-view__currency {
  color: var(--color-secondary);
}

.camp-new-view__control {
  width: 100%;
  min-height: 2.75rem;
  border: 0;
  border-bottom: 1px solid var(--color-on-surface);
  border-radius: 0;
  background: transparent;
  padding: 0.5rem 0;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.4;
  text-transform: none;
  color: var(--color-on-surface);
}

.camp-new-view__control::placeholder {
  color: var(--color-secondary);
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0;
  opacity: 0.62;
  text-transform: none;
}

.camp-new-view__control:focus {
  border-bottom-color: var(--color-primary);
  border-bottom-width: 2px;
  outline: 0;
}

.camp-new-view__textarea {
  min-height: 7rem;
  resize: vertical;
}

.camp-new-view__actions {
  padding-block-start: 2rem;
  border-block-start: 1px dashed var(--color-on-surface);
}

.camp-new-view__submit {
  width: 100%;
  min-height: 3.5rem;
  box-shadow: 4px 4px 0 0 var(--color-on-surface);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  letter-spacing: 0.22em;
}

@media (min-width: 48rem) {
  .camp-new-view {
    padding-inline: 2rem;
  }

  .camp-new-view__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .camp-new-view__body {
    gap: 2rem;
    padding: 2rem;
  }
}
</style>
