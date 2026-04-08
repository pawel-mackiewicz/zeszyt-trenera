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
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import { useRouter } from '@/ui/router/runtime'

const router = useRouter()
const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })

const firstName = ref('')
const lastName = ref('')
// What: keep the country code in its own input with a Polish default. Why: most registrations use the same prefix, so separating it cuts repetitive typing on the mobile-first add-member flow.
const countryCode = ref('+48')
// What: store the subscriber part separately from the country code. Why: the form must be able to intentionally submit “no phone” without forcing users to clear a prefilled prefix.
const phoneNumberRest = ref('')
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

function dismissSubmitError() {
  // What: let coaches close the shared floating error card after reading it. Why: recoverable save failures should stay visible until the coach acts, but not pin the screen once the message is clear.
  submitErrorKey.value = null
}

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
  const countryCodePart = countryCode.value.trim()
  const phoneNumberPart = phoneNumberRest.value.trim()

  if (!fName || !lName) {
    // What: keep the form state as a local error key. Why: required-field guidance is specific to this form and belongs next to its field copy.
    submitErrorKey.value = 'required'
    return
  }

  isSubmitting.value = true

  try {
    // What: collapse the split phone inputs into one application command field. Why: the UI owns the mobile-friendly input shape, while the application layer still owns normalization of present vs absent phone data.
    const phoneNumber = phoneNumberPart
      ? `${countryCodePart} ${phoneNumberPart}`.trim()
      : null

    await useCases.registerMember.handle({
      firstName: fName,
      lastName: lName,
      // What: send null when the local phone part is empty. Why: the application layer should receive an explicit absence instead of inferring meaning from the UI’s split input state.
      phoneNumber,
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
      <!-- What: route add-member failures through the shared floating alert. Why: this screen should announce recoverable save problems in the same place and with the same swipe-to-dismiss behavior as the rest of the app. -->
      <FloatingErrorAlert
        v-if="submitError"
        :message="submitError"
        top-offset="shell"
        @dismiss="dismissSubmitError"
      />

      <!-- Personal Information Cluster -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        <div class="relative group">
          <!-- What: show a stronger required marker only on the two identity fields the app must have. Why: registration now matches the application contract where phone and dates can stay empty, so the mandatory fields need to stand out at a glance on small screens. -->
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="firstName"
            >{{ t('fields.firstName.label') }}
            <span
              aria-hidden="true"
              class="ml-1 inline-block text-sm leading-none font-black text-danger"
              >*</span
            ></label
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
            >{{ t('fields.lastName.label') }}
            <span
              aria-hidden="true"
              class="ml-1 inline-block text-sm leading-none font-black text-danger"
              >*</span
            ></label
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
            for="phoneCountryCode"
            >{{ t('fields.phoneNumber.label') }}</label
          >
          <div
            class="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-6"
          >
            <div class="relative group">
              <label
                class="block font-mono text-[11px] font-bold tracking-widest text-outline mb-2 uppercase cursor-pointer"
                for="phoneCountryCode"
                >{{ t('fields.phoneNumber.countryCodeLabel') }}</label
              >
              <input
                id="phoneCountryCode"
                v-model="countryCode"
                class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
                :placeholder="t('fields.phoneNumber.countryCodePlaceholder')"
                type="tel"
              />
            </div>
            <div class="relative group">
              <label
                class="block font-mono text-[11px] font-bold tracking-widest text-outline mb-2 uppercase cursor-pointer"
                for="phoneNumberRest"
                >{{ t('fields.phoneNumber.localNumberLabel') }}</label
              >
              <input
                id="phoneNumberRest"
                v-model="phoneNumberRest"
                class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
                :placeholder="t('fields.phoneNumber.localNumberPlaceholder')"
                type="tel"
              />
            </div>
          </div>
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
      "required": "Podaj imię i nazwisko.",
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
        "countryCodeLabel": "Kierunkowy",
        "countryCodePlaceholder": "+48",
        "localNumberLabel": "Reszta numeru",
        "localNumberPlaceholder": "000 000 000"
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
      "required": "Enter the first name and last name.",
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
        "countryCodeLabel": "Country code",
        "countryCodePlaceholder": "+48",
        "localNumberLabel": "Rest of number",
        "localNumberPlaceholder": "000 000 000"
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
