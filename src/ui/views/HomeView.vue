<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import { ClubAlreadyExistsError } from '@/domain/model/club'
import { useAppServices } from '@/ui/appServices'

type SetupSignal = {
  label: string
  value: string
}

type SetupStep = {
  title: string
  detail: string
}

type SuccessState = {
  clubName: string
  foundingDateLabel: string
}

// Reading workflows straight from the shared service bag keeps new use cases additive without forcing edits in the UI DI module.
const registerClubUseCase = useAppServices().useCases.registerClub

const setupSignals: SetupSignal[] = [
  { label: 'Storage', value: 'Dexie writes club + event rows' },
  { label: 'Mode', value: 'Works offline after first shell load' },
  { label: 'Scope', value: 'Local-first foundation for training notebooks' }
]

const setupSteps: SetupStep[] = [
  {
    title: 'Create the anchor record',
    detail:
      'The club becomes the first durable entity in local storage and the base for future training, roster, and event workflows.'
  },
  {
    title: 'Capture a stable founding date',
    detail:
      'The founding date is saved as a real date object so later screens can reuse it without reparsing free-form text.'
  },
  {
    title: 'Confirm local persistence early',
    detail:
      'This flow proves the app can write real domain data before sync, auth, or remote APIs are introduced.'
  }
]

const whatHappensNext: SetupStep[] = [
  {
    title: 'Club snapshot is saved',
    detail:
      'The club name, founding date, generated id, and creation timestamp are stored in IndexedDB.'
  },
  {
    title: 'Domain event is recorded',
    detail:
      'A matching `club.created` event is persisted beside the club row for auditability and later replay paths.'
  },
  {
    title: 'The app stays on setup',
    detail:
      'You get immediate confirmation on this screen instead of being redirected into an unfinished workflow.'
  }
]

const form = reactive({
  clubName: '',
  foundingDate: ''
})

const isSubmitting = ref(false)
const submitError = ref('')
const successState = ref<SuccessState | null>(null)

const canSubmit = computed(
  () =>
    form.clubName.trim().length > 0 &&
    form.foundingDate.length > 0 &&
    !isSubmitting.value
)

function formatFoundingDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`)

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC'
  }).format(date)
}

// Duplicate-club failures need dedicated guidance because retrying the same form cannot succeed while setup stays single-club.
function toSubmitError(error: unknown) {
  if (error instanceof ClubAlreadyExistsError) {
    return 'A club is already registered on this device. Reuse the saved club instead of creating a second one.'
  }

  return 'The club could not be saved locally. Keep the values, check the device state, and try again.'
}

async function handleSubmit() {
  submitError.value = ''
  successState.value = null

  const clubName = form.clubName.trim()

  if (!clubName || !form.foundingDate) {
    submitError.value = 'Enter the club name and founding date before saving.'
    return
  }

  isSubmitting.value = true

  try {
    await registerClubUseCase.handle({
      clubName,
      foundingDate: new Date(`${form.foundingDate}T00:00:00Z`)
    })

    successState.value = {
      clubName,
      foundingDateLabel: formatFoundingDateLabel(form.foundingDate)
    }

    form.clubName = ''
    form.foundingDate = ''
  } catch (error) {
    submitError.value = toSubmitError(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="setup-grid">
    <article class="setup-card setup-card--hero">
      <p class="setup-card__eyebrow">First real workflow</p>
      <h2 class="setup-card__title">
        Register the club before the notebook grows around it.
      </h2>
      <p class="setup-card__copy">
        This replaces the starter placeholder with the first domain-backed
        action in the app: saving a club record and the matching domain event in
        local storage. The shell still handles install, offline state, and
        updates around it.
      </p>

      <div class="setup-card__signals" aria-label="Workflow signals">
        <div
          v-for="signal in setupSignals"
          :key="signal.label"
          class="setup-card__signal"
        >
          <strong>{{ signal.label }}</strong>
          <span>{{ signal.value }}</span>
        </div>
      </div>
    </article>

    <article class="setup-card setup-card--form">
      <div class="setup-card__heading">
        <p class="setup-card__eyebrow">Club setup</p>
        <h3 class="setup-card__subtitle">Save the first local record</h3>
        <p class="setup-card__copy setup-card__copy--compact">
          Use the same Dexie-backed registration flow already covered by the
          infrastructure spec.
        </p>
      </div>

      <div
        v-if="successState"
        class="message-banner message-banner--success"
        role="status"
      >
        <strong>{{ successState.clubName }} saved offline.</strong>
        <span
          >Founding date recorded as {{ successState.foundingDateLabel }}.</span
        >
      </div>

      <div
        v-if="submitError"
        class="message-banner message-banner--danger"
        role="alert"
      >
        <strong>Save failed.</strong>
        <span>{{ submitError }}</span>
      </div>

      <form class="setup-form" @submit.prevent="handleSubmit">
        <label class="form-control" for="clubName">
          <span class="form-control__label">Club name</span>
          <input
            id="clubName"
            v-model="form.clubName"
            class="form-control__input"
            name="clubName"
            type="text"
            autocomplete="organization"
            placeholder="ZKS Wlokniarz Czestochowa"
            required
          />
        </label>

        <label class="form-control" for="foundingDate">
          <span class="form-control__label">Founding date</span>
          <input
            id="foundingDate"
            v-model="form.foundingDate"
            class="form-control__input"
            name="foundingDate"
            type="date"
            required
          />
        </label>

        <div class="setup-form__footer">
          <p class="setup-form__hint">
            The date is converted to a UTC midnight timestamp before it reaches
            the use case.
          </p>
          <button class="button-brand" type="submit" :disabled="!canSubmit">
            {{ isSubmitting ? 'Saving club...' : 'Register club' }}
          </button>
        </div>
      </form>
    </article>

    <article class="setup-card">
      <p class="setup-card__eyebrow">Why this matters</p>
      <h3 class="setup-card__subtitle">The setup flow proves the app shape</h3>
      <ol class="setup-list">
        <li
          v-for="step in setupSteps"
          :key="step.title"
          class="setup-list__item"
        >
          <strong>{{ step.title }}</strong>
          <span>{{ step.detail }}</span>
        </li>
      </ol>
    </article>

    <article class="setup-card setup-card--deep">
      <p class="setup-card__eyebrow">After save</p>
      <h3 class="setup-card__subtitle">What happens next in storage</h3>
      <ul class="setup-list setup-list--unordered">
        <li
          v-for="step in whatHappensNext"
          :key="step.title"
          class="setup-list__item"
        >
          <strong>{{ step.title }}</strong>
          <span>{{ step.detail }}</span>
        </li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.setup-grid {
  display: grid;
  gap: 1rem;
}

.setup-card {
  position: relative;
  overflow: hidden;
  padding: 1.35rem;
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
  background: var(--bg-panel);
  box-shadow: var(--shadow-soft);
}

.setup-card--hero {
  background:
    linear-gradient(
      145deg,
      rgba(255, 250, 242, 0.96),
      rgba(220, 230, 215, 0.78)
    ),
    linear-gradient(135deg, rgba(77, 128, 146, 0.08), transparent 48%);
}

.setup-card--hero::after {
  content: '';
  position: absolute;
  inset: auto -2.5rem -3rem auto;
  width: 11rem;
  height: 11rem;
  border-radius: 2rem;
  background: linear-gradient(
    145deg,
    rgba(77, 128, 146, 0.2),
    rgba(199, 106, 43, 0.22)
  );
  transform: rotate(12deg);
}

.setup-card--form {
  background:
    linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.96),
      rgba(247, 240, 223, 0.92)
    ),
    var(--bg-panel);
}

.setup-card--deep {
  background:
    linear-gradient(155deg, rgba(16, 59, 55, 0.94), rgba(15, 107, 87, 0.88)),
    rgba(16, 59, 55, 0.94);
  color: #eff5ea;
}

.setup-card__heading,
.setup-card__signals,
.setup-card__title,
.setup-card__copy {
  position: relative;
  z-index: 1;
}

.setup-card__eyebrow {
  margin: 0 0 0.5rem;
  color: var(--accent);
  font: 700 0.82rem/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.setup-card--deep .setup-card__eyebrow {
  color: rgba(239, 245, 234, 0.72);
}

.setup-card__title,
.setup-card__subtitle {
  margin: 0;
  font-family: var(--font-display);
  line-height: 0.98;
  letter-spacing: -0.02em;
}

.setup-card__title {
  max-width: 13ch;
  font-size: clamp(2rem, 5.5vw, 3.25rem);
}

.setup-card__subtitle {
  font-size: 1.65rem;
}

.setup-card__copy {
  margin: 1rem 0 0;
  max-width: 40rem;
  color: var(--ink-soft);
  line-height: 1.6;
}

.setup-card__copy--compact {
  max-width: 32rem;
}

.setup-card--deep .setup-card__copy,
.setup-card--deep .setup-list__item span {
  color: rgba(239, 245, 234, 0.82);
}

.setup-card__signals {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.4rem;
}

.setup-card__signal {
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(6px);
}

.setup-card__signal strong,
.setup-card__signal span {
  display: block;
}

.setup-card__signal strong {
  font-family: var(--font-display);
  font-size: 1.08rem;
}

.setup-card__signal span {
  margin-top: 0.25rem;
  color: var(--ink-soft);
  line-height: 1.45;
}

.setup-form {
  display: grid;
  gap: 1rem;
  margin-top: 1.25rem;
}

.setup-form__footer {
  display: grid;
  gap: 0.85rem;
}

.setup-form__hint {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.95rem;
  line-height: 1.5;
}

.setup-list {
  margin: 1rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.9rem;
}

.setup-list--unordered {
  list-style: none;
  padding-left: 0;
}

.setup-list__item {
  display: grid;
  gap: 0.35rem;
}

.setup-list__item strong {
  font-family: var(--font-display);
  font-size: 1.05rem;
}

.setup-list__item span {
  color: var(--ink-soft);
  line-height: 1.55;
}

@media (min-width: 900px) {
  .setup-grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(20rem, 1fr);
    align-items: start;
  }

  .setup-card--hero {
    min-height: 100%;
    grid-column: 1;
  }

  .setup-card--form {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}
</style>
