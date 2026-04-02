<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { ClubAlreadyExistsError } from '@/domain/model/club'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import SetupStageLayout from '@/ui/components/SetupStageLayout.vue'

type SubmitErrorKey = 'required' | 'invalidDate' | 'alreadyExists' | 'submit'

const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })

const clubName = ref('')
const foundingDate = ref('')
const isSubmitting = ref(false)
const submitErrorKey = ref<SubmitErrorKey | null>(null)
const submitError = computed(() =>
  submitErrorKey.value === null ? '' : t(`errors.${submitErrorKey.value}`)
)

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00Z`)
}

function resolveSubmitErrorKey(error: unknown): SubmitErrorKey {
  // What: translate use-case failures into onboarding-specific copy. Why: the setup step needs short recovery guidance without leaking storage or exception details into the UI.
  if (error instanceof ClubAlreadyExistsError) {
    return 'alreadyExists'
  }

  return 'submit'
}

async function handleSubmit() {
  submitErrorKey.value = null

  const nextClubName = clubName.value.trim()

  if (!nextClubName || !foundingDate.value) {
    // What: keep empty-field guidance local to the setup form. Why: the very first screen should stop incomplete submissions before opening the single-club write workflow.
    submitErrorKey.value = 'required'
    return
  }

  const nextFoundingDate = toUtcDate(foundingDate.value)

  if (Number.isNaN(nextFoundingDate.getTime())) {
    submitErrorKey.value = 'invalidDate'
    return
  }

  isSubmitting.value = true

  try {
    await useCases.registerClub.handle({
      clubName: nextClubName,
      foundingDate: nextFoundingDate
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
    <!-- What: keep the club setup form compact and single-purpose. Why: the first-run mobile flow should ask only for the minimum club identity required by the domain model. -->
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
            for="clubName"
            >{{ t('fields.clubName.label') }}</label
          >
          <input
            id="clubName"
            v-model="clubName"
            autocomplete="organization"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
            :placeholder="t('fields.clubName.placeholder')"
            type="text"
            required
          />
        </div>

        <div>
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="foundingDate"
            >{{ t('fields.foundingDate.label') }}</label
          >
          <input
            id="foundingDate"
            v-model="foundingDate"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm uppercase focus:border-primary transition-colors duration-200"
            type="date"
            required
          />
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <!-- What: keep onboarding submit actions on the shared CTA primitive. Why: setup screens should inherit the same tactile button states as the shell without owning another copy of the visual recipe. -->
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
    "title": "Dodaj klub",
    "step": "Krok 1 z 2",
    "actions": {
      "submit": "Zapisz klub",
      "submitting": "Zapisywanie..."
    },
    "errors": {
      "title": "Nie udało się zapisać klubu",
      "required": "Podaj nazwę klubu i datę założenia.",
      "invalidDate": "Sprawdź datę założenia.",
      "alreadyExists": "Klub jest już zapisany na tym urządzeniu.",
      "submit": "Nie udało się zapisać klubu. Sprawdź dane i spróbuj ponownie."
    },
    "fields": {
      "clubName": {
        "label": "Nazwa klubu",
        "placeholder": "Na przykład ZKS Włókniarz Częstochowa"
      },
      "foundingDate": {
        "label": "Data założenia"
      }
    }
  },
  "en": {
    "title": "Add the club",
    "step": "Step 1 of 2",
    "actions": {
      "submit": "Save club",
      "submitting": "Saving..."
    },
    "errors": {
      "title": "The club could not be saved",
      "required": "Enter the club name and founding date.",
      "invalidDate": "Check the founding date.",
      "alreadyExists": "The club is already saved on this device.",
      "submit": "The club could not be saved. Check the details and try again."
    },
    "fields": {
      "clubName": {
        "label": "Club name",
        "placeholder": "For example Riverside Wrestling Club"
      },
      "foundingDate": {
        "label": "Founding date"
      }
    }
  }
}
</i18n>
