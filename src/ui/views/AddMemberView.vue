<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from '@/ui/router/runtime'
import { useAppServices } from '@/ui/appServices'

const router = useRouter()
const { useCases } = useAppServices()

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
    submitError.value = 'Podaj imię, nazwisko i numer telefonu.'
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
      error instanceof Error
        ? error.message
        : 'Nie udało się zapisać członka. Sprawdź poprawność danych (np. numer telefonu powinien zaczynać się od +48)'
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
            >Imię</label
          >
          <input
            id="firstName"
            v-model="firstName"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
            placeholder="WPISZ IMIĘ"
            type="text"
            required
          />
        </div>
        <div class="relative group">
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="lastName"
            >Nazwisko</label
          >
          <input
            id="lastName"
            v-model="lastName"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
            placeholder="WPISZ NAZWISKO"
            type="text"
            required
          />
        </div>
        <div class="relative group md:col-span-2">
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="phoneNumber"
            >Numer Telefonu</label
          >
          <input
            id="phoneNumber"
            v-model="phoneNumber"
            class="w-full bg-transparent border-t-0 border-x-0 border-b border-on-surface py-2 font-mono text-sm placeholder:text-outline-variant focus:border-primary transition-colors duration-200"
            placeholder="+48 000 000 000"
            type="tel"
            required
          />
        </div>
        <div class="relative group">
          <label
            class="block font-mono text-[11px] font-bold tracking-widest text-on-surface mb-2 uppercase cursor-pointer"
            for="dateOfBirth"
            >Data Urodzenia</label
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
            >Data Dołączenia</label
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
          {{ isSubmitting ? 'ZAPISYWANIE' : 'ZAPISZ' }}
        </button>
      </div>
    </form>
  </div>
</template>
