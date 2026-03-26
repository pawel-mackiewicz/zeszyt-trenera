<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useRouter } from '@/ui/router/runtime'
import { useAppServices } from '@/ui/appServices'

const router = useRouter()
const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })

const firstName = ref('')
const lastName = ref('')
const phoneNumber = ref('')
const dateOfBirth = ref('')
const joinedAt = ref('')

const isSubmitting = ref(false)
const submitError = ref('')

function toUtcDate(value: string) {
  if (!value) return undefined
  return new Date(`${value}T00:00:00Z`)
}

async function handleSubmit() {
  submitError.value = ''

  const fName = firstName.value.trim()
  const lName = lastName.value.trim()
  const phone = phoneNumber.value.trim()

  if (!fName || !lName || !phone) {
    // Keeping validation copy in the form component lets this screen own its local dictionary instead of pushing UI text into shared services.
    submitError.value = t('errors.required')
    return
  }

  isSubmitting.value = true

  try {
    await useCases.registerMember.handle({
      firstName: fName,
      lastName: lName,
      phoneNumber: phone,
      ...(dateOfBirth.value
        ? { dateOfBirth: toUtcDate(dateOfBirth.value) }
        : {}),
      ...(joinedAt.value ? { joinedAt: toUtcDate(joinedAt.value) } : {})
    })

    // On success, go back to list
    router.replace('/')
  } catch (error: unknown) {
    submitError.value =
      error instanceof Error ? error.message : t('errors.submit')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto pt-10 pb-32">
    <!-- Form Section -->
    <form class="space-y-10" @submit.prevent="handleSubmit">
      <div
        v-if="submitError"
        class="bg-danger/10 border border-danger p-4 mb-6"
      >
        <p class="font-mono text-sm text-danger font-bold uppercase">
          {{ submitError }}
        </p>
      </div>

      <!-- Personal Information Cluster -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        <div class="relative group">
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="firstName"
            >{{ t('fields.firstName.label') }}</label
          >
          <input
            id="firstName"
            v-model="firstName"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
            :placeholder="t('fields.firstName.placeholder')"
            type="text"
            required
          />
        </div>
        <div class="relative group">
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="lastName"
            >{{ t('fields.lastName.label') }}</label
          >
          <input
            id="lastName"
            v-model="lastName"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
            :placeholder="t('fields.lastName.placeholder')"
            type="text"
            required
          />
        </div>
        <div class="relative group md:col-span-2">
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="phoneNumber"
            >{{ t('fields.phoneNumber.label') }}</label
          >
          <input
            id="phoneNumber"
            v-model="phoneNumber"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
            :placeholder="t('fields.phoneNumber.placeholder')"
            type="tel"
            required
          />
        </div>
        <div class="relative group">
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="dateOfBirth"
            >{{ t('fields.dateOfBirth.label') }}</label
          >
          <div class="relative">
            <input
              id="dateOfBirth"
              v-model="dateOfBirth"
              class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm focus:border-primary transition-colors duration-200 uppercase"
              type="date"
            />
          </div>
        </div>
        <div class="relative group">
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="joinedAt"
            >{{ t('fields.joinedAt.label') }}</label
          >
          <div class="relative">
            <input
              id="joinedAt"
              v-model="joinedAt"
              class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm focus:border-primary transition-colors duration-200 uppercase"
              type="date"
            />
          </div>
        </div>
      </div>

      <!-- Submit Action -->
      <div class="pt-8 flex justify-end">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="bg-primary hover:bg-surface-tint text-white px-12 py-4 font-mono font-bold tracking-[0.2em] border border-on-surface hard-shadow transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:scale-95 duration-75 uppercase disabled:opacity-50"
        >
          {{ isSubmitting ? t('actions.submitting') : t('actions.submit') }}
        </button>
      </div>
    </form>
  </div>
</template>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "submit": "Zapisz",
      "submitting": "Zapisywanie"
    },
    "errors": {
      "required": "Podaj imię, nazwisko i numer telefonu.",
      "submit": "Nie udało się zapisać członka. Sprawdź poprawność danych, na przykład numer telefonu powinien zaczynać się od +48."
    },
    "fields": {
      "firstName": {
        "label": "Imię",
        "placeholder": "Wpisz imię"
      },
      "lastName": {
        "label": "Nazwisko",
        "placeholder": "Wpisz nazwisko"
      },
      "phoneNumber": {
        "label": "Numer telefonu",
        "placeholder": "+48 000 000 000"
      },
      "dateOfBirth": {
        "label": "Data urodzenia"
      },
      "joinedAt": {
        "label": "Data dołączenia"
      }
    }
  },
  "en": {
    "actions": {
      "submit": "Save",
      "submitting": "Saving"
    },
    "errors": {
      "required": "Enter the first name, last name, and phone number.",
      "submit": "The member could not be saved. Check the data, for example the phone number should start with +48."
    },
    "fields": {
      "firstName": {
        "label": "First name",
        "placeholder": "Enter first name"
      },
      "lastName": {
        "label": "Last name",
        "placeholder": "Enter last name"
      },
      "phoneNumber": {
        "label": "Phone number",
        "placeholder": "+48 000 000 000"
      },
      "dateOfBirth": {
        "label": "Date of birth"
      },
      "joinedAt": {
        "label": "Join date"
      }
    }
  }
}
</i18n>
