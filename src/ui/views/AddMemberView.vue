<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  InvalidMemberBirthDateError,
  InvalidMemberJoinDateError,
  InvalidMemberNameError,
  MemberAlreadyExistsError
} from '@/domain/model/member'
import { InvalidPhoneNumberError } from '@/domain/model/vo/PhoneNumber'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import { useRouter } from '@/ui/router/runtime'

const router = useRouter()
const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })

const firstName = ref('')
const lastName = ref('')
// What: prefill the phone input with Poland's country code. Why: most members use Polish numbers, so this removes repetitive typing on every mobile add-member flow.
const phoneNumber = ref('+48 ')
const dateOfBirth = ref('')
const joinedAt = ref('')

const isSubmitting = ref(false)
type SubmitErrorKey =
  | 'required'
  | 'submit'
  | 'invalidPhoneNumber'
  | 'alreadyExists'
  | 'invalidBirthDate'
  | 'invalidJoinDate'
  | 'invalidName'

const submitErrorKey = ref<SubmitErrorKey | null>(null)
const submitError = computed(() =>
  submitErrorKey.value === null ? '' : t(`errors.${submitErrorKey.value}`)
)

function toUtcDate(value: string) {
  if (!value) return undefined
  return new Date(`${value}T00:00:00Z`)
}

function resolveSubmitErrorKey(error: unknown): SubmitErrorKey {
  // What: map member-registration failures to the form's own recovery copy. Why: this screen should own the wording for errors that only it can render and help the user fix.
  if (error instanceof InvalidPhoneNumberError) {
    return 'invalidPhoneNumber'
  }

  if (error instanceof MemberAlreadyExistsError) {
    return 'alreadyExists'
  }

  if (error instanceof InvalidMemberBirthDateError) {
    return 'invalidBirthDate'
  }

  if (error instanceof InvalidMemberJoinDateError) {
    return 'invalidJoinDate'
  }

  if (error instanceof InvalidMemberNameError) {
    return 'invalidName'
  }

  return 'submit'
}

async function handleSubmit() {
  submitErrorKey.value = null

  const fName = firstName.value.trim()
  const lName = lastName.value.trim()
  const phone = phoneNumber.value.trim()

  if (!fName || !lName || !phone) {
    // What: keep the form state as a local error key. Why: required-field guidance is specific to this form and belongs next to its field copy.
    submitErrorKey.value = 'required'
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

    // What: return successful member creation to the canonical roster URL. Why: `/member` is now the stable home for the roster flow, so setup redirects and form completion should land in the same place.
    router.replace('/member')
  } catch (error: unknown) {
    submitErrorKey.value = resolveSubmitErrorKey(error)
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
        <!-- What: keep the member form submit CTA on the shared primitive. Why: this screen should reuse the same button contract as setup and history while still owning its own form layout. -->
        <AppButton type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? t('actions.submitting') : t('actions.submit') }}
        </AppButton>
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
      "submit": "Nie udało się zapisać członka. Sprawdź dane i spróbuj ponownie.",
      "invalidPhoneNumber": "Sprawdź numer telefonu. Użyj numeru z kierunkowym kraju, na przykład +48 000 000 000.",
      "alreadyExists": "Członek z takim imieniem, nazwiskiem i numerem telefonu jest już zapisany.",
      "invalidBirthDate": "Data urodzenia musi być w przeszłości.",
      "invalidJoinDate": "Data dołączenia musi być późniejsza niż data urodzenia i nie może być z przyszłości.",
      "invalidName": "W polach imię i nazwisko użyj tylko liter, spacji lub łączników."
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
      "submit": "The member could not be saved. Check the details and try again.",
      "invalidPhoneNumber": "Check the phone number. Use a number with the country code, for example +48 000 000 000.",
      "alreadyExists": "A member with this name and phone number is already saved.",
      "invalidBirthDate": "The date of birth must be in the past.",
      "invalidJoinDate": "The join date must be after the date of birth and cannot be in the future.",
      "invalidName": "Use only letters, spaces, or hyphens in the name fields."
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
