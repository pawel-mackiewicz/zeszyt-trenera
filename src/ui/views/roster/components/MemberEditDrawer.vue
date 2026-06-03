<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  InvalidMemberBirthDateError,
  InvalidMemberJoinDateError,
  InvalidMemberNameError,
  MemberAlreadyExistsError,
  MemberNotFoundError
} from '@/write/domain/model/Member'
import { InvalidPhoneNumberError } from '@/write/domain/model/vo/PhoneNumber'
import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'

const props = defineProps<{
  isOpen: boolean
  member: MemberRosterListItem
}>()

const emit = defineEmits<{
  cancel: []
  error: [message: string]
  saved: [member: MemberRosterListItem]
}>()

const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })
const firstName = ref('')
const lastName = ref('')
const phoneNumber = ref('')
const dateOfBirth = ref('')
const joinedAt = ref('')
const isSaving = ref(false)
type EditErrorKey =
  | 'submit'
  | 'invalidPhoneNumber'
  | 'alreadyExists'
  | 'invalidBirthDate'
  | 'invalidJoinDate'
  | 'invalidName'
  | 'notFound'
const editErrorKey = ref<EditErrorKey | null>(null)
const editError = computed(() =>
  editErrorKey.value === null ? '' : t(`errors.${editErrorKey.value}`)
)

function formatDateForInput(value: Date): string {
  return value.toISOString().split('T')[0]
}

function formatOptionalDateForInput(value: Date | undefined): string {
  if (!value) return ''
  return formatDateForInput(value)
}

function hydrateForm(member: MemberRosterListItem) {
  editErrorKey.value = null
  firstName.value = member.firstName
  lastName.value = member.lastName
  // What: hydrate the drawer edit field with a real empty string when the stored member has no phone. Why: the mobile edit form still expects text input state even though persistence now allows the field to be missing entirely.
  phoneNumber.value = member.phoneNumber ?? ''
  dateOfBirth.value = formatDateForInput(member.dateOfBirth)
  joinedAt.value = formatOptionalDateForInput(member.joinedAt)
}

watch(
  () => [props.member, props.isOpen] as const,
  ([member, isOpen]) => {
    if (isOpen) hydrateForm(member)
  },
  { immediate: true }
)

function toUtcDate(value: string) {
  if (!value) return undefined
  return new Date(`${value}T00:00:00Z`)
}

function resolveEditErrorKey(error: unknown): EditErrorKey {
  if (error instanceof InvalidPhoneNumberError) return 'invalidPhoneNumber'
  if (error instanceof MemberAlreadyExistsError) return 'alreadyExists'
  if (error instanceof InvalidMemberBirthDateError) return 'invalidBirthDate'
  if (error instanceof InvalidMemberJoinDateError) return 'invalidJoinDate'
  if (error instanceof InvalidMemberNameError) return 'invalidName'
  if (error instanceof MemberNotFoundError) return 'notFound'
  return 'submit'
}

function publishError(key: EditErrorKey) {
  editErrorKey.value = key
  emit('error', editError.value)
}

function cancelEditing() {
  editErrorKey.value = null
  emit('error', '')
  emit('cancel')
}

async function saveMemberEdit() {
  editErrorKey.value = null
  emit('error', '')
  isSaving.value = true

  try {
    const updatedDateOfBirth = toUtcDate(dateOfBirth.value)
    if (!updatedDateOfBirth) {
      // What: block member edits that clear the birth date before crossing into the application layer. Why: date of birth is now part of mandatory member identity and must always be included in update commands.
      publishError('invalidBirthDate')
      return
    }

    const trimmedPhoneNumber = phoneNumber.value.trim()
    const updatedJoinedAt = toUtcDate(joinedAt.value)

    await useCases.updateMember.handle({
      memberId: props.member.id,
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      phoneNumber: trimmedPhoneNumber,
      dateOfBirth: updatedDateOfBirth,
      ...(joinedAt.value ? { joinedAt: updatedJoinedAt } : {})
    })

    emit('saved', {
      ...props.member,
      firstName: firstName.value.trim().toLowerCase(),
      lastName: lastName.value.trim().toLowerCase(),
      // What: mirror the new persisted member shape during optimistic updates. Why: the list should not reintroduce the old empty-string sentinel while waiting for the next Dexie read.
      ...(trimmedPhoneNumber
        ? { phoneNumber: trimmedPhoneNumber }
        : { phoneNumber: undefined }),
      dateOfBirth: updatedDateOfBirth,
      joinedAt: updatedJoinedAt
    })
  } catch (error: unknown) {
    publishError(resolveEditErrorKey(error))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <form
    v-if="isOpen"
    class="col-span-2 md:col-span-4 mt-2 border-t border-outline-variant pt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
    @submit.prevent="saveMemberEdit"
  >
    <!-- What: inline edit fields live under expanded member details. Why: list users can adjust data in place without leaving this mobile-first workflow. -->
    <div class="flex flex-col">
      <!-- What: connect each visible edit label to its field with a per-member id. Why: mobile users, assistive tech, and E2E tests should all target the same accessible form controls instead of structural markup. -->
      <!-- What: keep the edit labels plain even for mandatory identity fields. Why: the explicit required marker is reserved for the add-member flow, while edit stays visually lighter for quick inline corrections. -->
      <label
        :for="`member-edit-first-name-${member.id}`"
        class="font-label text-[0.6rem] text-secondary uppercase font-bold"
        >{{ t('fields.firstName') }}</label
      >
      <!-- What: render the editable first name in uppercase. Why: the edit state should match the member list presentation, so coaches do not see the name switch casing mid-flow. -->
      <input
        :id="`member-edit-first-name-${member.id}`"
        v-model="firstName"
        type="text"
        class="bg-transparent border-b border-on-surface py-2 font-mono text-sm uppercase"
        required
      />
    </div>
    <div class="flex flex-col">
      <label
        :for="`member-edit-last-name-${member.id}`"
        class="font-label text-[0.6rem] text-secondary uppercase font-bold"
        >{{ t('fields.lastName') }}</label
      >
      <!-- What: render the editable last name in uppercase. Why: the edit form should preserve the same visual identity cues as the roster rows instead of dropping back to lowercase. -->
      <input
        :id="`member-edit-last-name-${member.id}`"
        v-model="lastName"
        type="text"
        class="bg-transparent border-b border-on-surface py-2 font-mono text-sm uppercase"
        required
      />
    </div>
    <div class="flex flex-col">
      <label
        :for="`member-edit-phone-number-${member.id}`"
        class="font-label text-[0.6rem] text-secondary uppercase font-bold"
        >{{ t('fields.phoneNumber') }}</label
      >
      <input
        :id="`member-edit-phone-number-${member.id}`"
        v-model="phoneNumber"
        type="tel"
        class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
      />
    </div>
    <div class="flex flex-col">
      <label
        :for="`member-edit-date-of-birth-${member.id}`"
        class="font-label text-[0.6rem] text-secondary uppercase font-bold"
        >{{ t('fields.dateOfBirth') }}</label
      >
      <input
        :id="`member-edit-date-of-birth-${member.id}`"
        v-model="dateOfBirth"
        type="date"
        class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
        required
      />
    </div>
    <div class="flex flex-col">
      <label
        :for="`member-edit-joined-at-${member.id}`"
        class="font-label text-[0.6rem] text-secondary uppercase font-bold"
        >{{ t('fields.joinedAt') }}</label
      >
      <input
        :id="`member-edit-joined-at-${member.id}`"
        v-model="joinedAt"
        type="date"
        class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
      />
    </div>
    <div class="md:col-span-2 flex justify-end gap-2">
      <AppButton variant="secondary" type="button" @click="cancelEditing">
        {{ t('actions.cancel') }}
      </AppButton>
      <AppButton type="submit" :disabled="isSaving">
        {{ isSaving ? t('actions.saving') : t('actions.save') }}
      </AppButton>
    </div>
  </form>
</template>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "cancel": "Anuluj",
      "save": "Zapisz zmiany",
      "saving": "Zapisywanie"
    },
    "fields": {
      "firstName": "Imię",
      "lastName": "Nazwisko",
      "phoneNumber": "Telefon",
      "dateOfBirth": "Data ur.",
      "joinedAt": "Dołączył"
    },
    "errors": {
      "submit": "Nie udało się zapisać zmian.",
      "invalidPhoneNumber": "Podaj poprawny numer telefonu.",
      "alreadyExists": "Członek o tych danych już istnieje.",
      "invalidBirthDate": "Data urodzenia jest nieprawidłowa.",
      "invalidJoinDate": "Data dołączenia jest nieprawidłowa.",
      "invalidName": "Imię lub nazwisko jest nieprawidłowe.",
      "notFound": "Nie znaleziono członka do aktualizacji."
    }
  },
  "en": {
    "actions": {
      "cancel": "Cancel",
      "save": "Save changes",
      "saving": "Saving"
    },
    "fields": {
      "firstName": "First name",
      "lastName": "Last name",
      "phoneNumber": "Phone",
      "dateOfBirth": "Birth date",
      "joinedAt": "Joined"
    },
    "errors": {
      "submit": "Failed to save changes.",
      "invalidPhoneNumber": "Enter a valid phone number.",
      "alreadyExists": "A member with this identity already exists.",
      "invalidBirthDate": "Birth date is invalid.",
      "invalidJoinDate": "Join date is invalid.",
      "invalidName": "First or last name is invalid.",
      "notFound": "Member could not be found for update."
    }
  }
}
</i18n>
