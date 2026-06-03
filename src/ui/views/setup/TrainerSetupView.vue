<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { TrainerAlreadyExistsError } from '@/write/domain/model/Trainer'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import SetupStageLayout from '@/ui/components/SetupStageLayout.vue'

type SubmitErrorKey = 'required' | 'alreadyExists' | 'submit'

const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })

const trainerName = ref('')
const isSubmitting = ref(false)
const submitErrorKey = ref<SubmitErrorKey | null>(null)
const submitError = computed(() =>
  submitErrorKey.value === null ? '' : t(`errors.${submitErrorKey.value}`)
)

function dismissSubmitError() {
  // What: let onboarding hide the shared floating error card after it has been read. Why: the trainer step should keep recoverable save problems visible without forcing the coach to keep staring at a stale warning.
  submitErrorKey.value = null
}

function resolveSubmitErrorKey(error: unknown): SubmitErrorKey {
  // What: map setup write failures to the trainer step dictionary. Why: the final onboarding screen should keep recovery copy short and specific to the action the coach just took.
  if (error instanceof TrainerAlreadyExistsError) {
    return 'alreadyExists'
  }

  return 'submit'
}

async function handleSubmit() {
  submitErrorKey.value = null

  const nextTrainerName = trainerName.value.trim()

  if (!nextTrainerName) {
    // What: reject blank trainer identity before saving. Why: this step should avoid unnecessary write attempts when the final required record is obviously incomplete.
    submitErrorKey.value = 'required'
    return
  }

  isSubmitting.value = true

  try {
    await useCases.registerTrainer.handle({
      trainerName: nextTrainerName
    })
  } catch (error) {
    submitErrorKey.value = resolveSubmitErrorKey(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <SetupStageLayout :step-label="t('step')" :title="t('title')">
    <!-- What: end setup with one direct trainer form. Why: the shell should unlock as soon as the final required identity is saved, without extra confirmation screens or branching. -->
    <form class="space-y-8" @submit.prevent="handleSubmit">
      <!-- What: reuse the floating error card during setup. Why: the final onboarding step should present save failures with the same top-level treatment as the rest of the app even though the shell header is hidden here. -->
      <FloatingErrorAlert
        v-if="submitError"
        :message="submitError"
        top-offset="screen"
        @dismiss="dismissSubmitError"
      />

      <div class="grid gap-7">
        <div>
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="trainerName"
            >{{ t('fields.trainerName.label') }}</label
          >
          <input
            id="trainerName"
            v-model="trainerName"
            autocomplete="name"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
            :placeholder="t('fields.trainerName.placeholder')"
            type="text"
            required
          />
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <!-- What: keep onboarding submit actions on the shared CTA primitive. Why: the final setup step should stay visually consistent with the rest of the app without shipping its own button recipe. -->
        <AppButton :disabled="isSubmitting" type="submit">
          {{ isSubmitting ? t('actions.submitting') : t('actions.submit') }}
        </AppButton>
      </div>
    </form>
  </SetupStageLayout>
</template>

<i18n lang="json">
{
  "pl": {
    "title": "Dodaj trenera",
    "step": "Krok 2 z 2",
    "actions": {
      "submit": "Zapisz trenera",
      "submitting": "Zapisywanie..."
    },
    "errors": {
      "title": "Nie udało się zapisać trenera",
      "required": "Podaj nazwę trenera.",
      "alreadyExists": "Trener jest już zapisany na tym urządzeniu.",
      "submit": "Nie udało się zapisać trenera. Sprawdź dane i spróbuj ponownie."
    },
    "fields": {
      "trainerName": {
        "label": "Imię",
        "placeholder": "Na przykład Janek"
      }
    }
  },
  "en": {
    "title": "Add the trainer",
    "step": "Step 2 of 2",
    "actions": {
      "submit": "Save trainer",
      "submitting": "Saving..."
    },
    "errors": {
      "title": "The trainer could not be saved",
      "required": "Enter the trainer name.",
      "alreadyExists": "The trainer is already saved on this device.",
      "submit": "The trainer could not be saved. Check the details and try again."
    },
    "fields": {
      "trainerName": {
        "label": "Full name",
        "placeholder": "For example Joe"
      }
    }
  }
}
</i18n>
