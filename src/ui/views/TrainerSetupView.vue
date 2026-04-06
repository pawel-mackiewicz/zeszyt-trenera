<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { TrainerAlreadyExistsError } from '@/domain/model/trainer'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import SetupStageLayout from '@/ui/components/SetupStageLayout.vue'
import { useRouter } from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'

type SubmitErrorKey = 'required' | 'alreadyExists' | 'submit'

const { useCases } = useAppServices()
const router = useRouter()
const appStore = useAppStore()
const { t } = useI18n({ useScope: 'local' })

const trainerName = ref('')
const isSubmitting = ref(false)
const submitErrorKey = ref<SubmitErrorKey | null>(null)
const submitError = computed(() =>
  submitErrorKey.value === null ? '' : t(`errors.${submitErrorKey.value}`)
)

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
    // What: clear the skip marker before persisting setup. Why: saving trainer identity should immediately retire the deferred-onboarding state for this step.
    appStore.setTrainerSetupSkipped(false)
    await useCases.registerTrainer.handle({
      trainerName: nextTrainerName
    })
  } catch (error) {
    submitErrorKey.value = resolveSubmitErrorKey(error)
  } finally {
    isSubmitting.value = false
  }
}

function skipSetup() {
  // What: remember that trainer setup was deferred intentionally. Why: first-run onboarding must become optional while keeping a clear return path in the shell menu.
  appStore.setTrainerSetupSkipped(true)
  void router.push('/member')
}
</script>

<template>
  <SetupStageLayout :step-label="t('step')" :title="t('title')">
    <!-- What: end setup with one direct trainer form. Why: the shell should unlock as soon as the final required identity is saved, without extra confirmation screens or branching. -->
    <form class="space-y-8" @submit.prevent="handleSubmit">
      <div v-if="submitError" class="border border-danger bg-danger/10 p-4">
        <p class="font-mono text-sm font-bold uppercase text-danger">
          {{ submitError }}
        </p>
      </div>

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

      <div class="flex justify-between pt-4">
        <!-- What: expose a skip action on the final setup step. Why: users can enter the app immediately and complete trainer identity from the menu once ready. -->
        <AppButton type="button" variant="secondary" @click="skipSetup">
          {{ t('actions.skip') }}
        </AppButton>
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
      "skip": "Pomiń na teraz",
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
        "label": "Imię i nazwisko",
        "placeholder": "Na przykład Jan Kowalski"
      }
    }
  },
  "en": {
    "title": "Add the trainer",
    "step": "Step 2 of 2",
    "actions": {
      "skip": "Skip for now",
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
        "placeholder": "For example Jane Doe"
      }
    }
  }
}
</i18n>
