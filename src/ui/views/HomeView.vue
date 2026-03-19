<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import { ClubAlreadyExistsError } from '@/domain/model/club'
import { TrainerAlreadyExistsError } from '@/domain/model/trainer'
import { useAppServices } from '@/ui/appServices'

type SetupSignal = {
  label: string
  value: string
}

type SetupStep = {
  title: string
  detail: string
}

type ClubSuccessState = {
  clubName: string
  foundingDateLabel: string
}

type TrainerSuccessState = {
  trainerName: string
}

const { useCases } = useAppServices()
// Reading both setup workflows from one shared service bag keeps the view aligned with the DI rules while letting each form stay independent.
const registerClubUseCase = useCases.registerClub
const registerTrainerUseCase = useCases.registerTrainer

const setupSignals: SetupSignal[] = [
  { label: 'Storage', value: 'Dexie writes club, trainer, and event rows' },
  { label: 'Mode', value: 'Works offline after first shell load' },
  { label: 'Scope', value: 'Local-first foundation for training notebooks' }
]

const setupSteps: SetupStep[] = [
  {
    title: 'Create the club anchor',
    detail:
      'The club becomes the first durable entity in local storage and the base for future training, roster, and event workflows.'
  },
  {
    title: 'Name the trainer early',
    detail:
      'Saving the trainer during setup gives later roster and planning flows a real local owner instead of placeholder copy.'
  },
  {
    title: 'Capture a stable founding date',
    detail:
      'The founding date is saved as a real date object so later screens can reuse it without reparsing free-form text.'
  }
]

const whatHappensNext: SetupStep[] = [
  {
    title: 'A setup snapshot is saved',
    detail:
      'Each successful submit stores the generated id, creation timestamp, and form data in IndexedDB.'
  },
  {
    title: 'A matching domain event is recorded',
    detail:
      'Every saved record persists its paired domain event beside the row for auditability and later replay paths.'
  },
  {
    title: 'The app stays on setup',
    detail:
      'You get immediate confirmation on this screen instead of being redirected into unfinished club or trainer workflows.'
  }
]

const clubForm = reactive({
  clubName: '',
  foundingDate: ''
})

const trainerForm = reactive({
  trainerName: ''
})

// Keeping the submit states separate avoids coupling two local-first writes into one UI transaction with unclear rollback rules.
const isSubmittingClub = ref(false)
const isSubmittingTrainer = ref(false)
const clubSubmitError = ref('')
const trainerSubmitError = ref('')
const clubSuccessState = ref<ClubSuccessState | null>(null)
const trainerSuccessState = ref<TrainerSuccessState | null>(null)

const canSubmitClub = computed(
  () =>
    clubForm.clubName.trim().length > 0 &&
    clubForm.foundingDate.length > 0 &&
    !isSubmittingClub.value
)

const canSubmitTrainer = computed(
  () => trainerForm.trainerName.trim().length > 0 && !isSubmittingTrainer.value
)

function formatFoundingDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`)

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC'
  }).format(date)
}

// Duplicate-club failures need dedicated guidance because retrying the same form cannot succeed while setup stays single-club.
function toClubSubmitError(error: unknown) {
  if (error instanceof ClubAlreadyExistsError) {
    return 'A club is already registered on this device. Reuse the saved club instead of creating a second one.'
  }

  return 'The club could not be saved locally. Keep the values, check the device state, and try again.'
}

// Trainer setup follows the same singleton rule, so the UI should explain why another submit can never succeed on this device.
function toTrainerSubmitError(error: unknown) {
  if (error instanceof TrainerAlreadyExistsError) {
    return 'A trainer is already registered on this device. Reuse the saved trainer instead of creating a second one.'
  }

  return 'The trainer could not be saved locally. Keep the value, check the device state, and try again.'
}

async function handleClubSubmit() {
  clubSubmitError.value = ''
  clubSuccessState.value = null

  const clubName = clubForm.clubName.trim()

  if (!clubName || !clubForm.foundingDate) {
    clubSubmitError.value =
      'Enter the club name and founding date before saving.'
    return
  }

  isSubmittingClub.value = true

  try {
    await registerClubUseCase.handle({
      clubName,
      foundingDate: new Date(`${clubForm.foundingDate}T00:00:00Z`)
    })

    clubSuccessState.value = {
      clubName,
      foundingDateLabel: formatFoundingDateLabel(clubForm.foundingDate)
    }

    clubForm.clubName = ''
    clubForm.foundingDate = ''
  } catch (error) {
    clubSubmitError.value = toClubSubmitError(error)
  } finally {
    isSubmittingClub.value = false
  }
}

async function handleTrainerSubmit() {
  trainerSubmitError.value = ''
  trainerSuccessState.value = null

  const trainerName = trainerForm.trainerName.trim()

  if (!trainerName) {
    trainerSubmitError.value = 'Enter the trainer name before saving.'
    return
  }

  isSubmittingTrainer.value = true

  try {
    await registerTrainerUseCase.handle({
      trainerName
    })

    trainerSuccessState.value = {
      trainerName
    }

    trainerForm.trainerName = ''
  } catch (error) {
    trainerSubmitError.value = toTrainerSubmitError(error)
  } finally {
    isSubmittingTrainer.value = false
  }
}
</script>

<template>
  <section class="setup-grid">
    <article class="setup-card setup-card--hero">
      <p class="setup-card__eyebrow">First real workflow</p>
      <h2 class="setup-card__title">
        Register the club and trainer before the notebook grows around them.
      </h2>
      <p class="setup-card__copy">
        This replaces the starter placeholder with the first domain-backed setup
        actions in the app: saving club and trainer records with matching domain
        events in local storage. The shell still handles install, offline state,
        and updates around them.
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
        <p class="setup-card__eyebrow">Notebook setup</p>
        <h3 class="setup-card__subtitle">Save the first local records</h3>
        <p class="setup-card__copy setup-card__copy--compact">
          Both forms use the shared service bag, so the view stays unaware of
          Dexie adapters while setup still writes real offline data.
        </p>
      </div>

      <div class="setup-form-stack">
        <section class="setup-form-panel" aria-labelledby="club-setup-title">
          <div class="setup-form-panel__heading">
            <h4 id="club-setup-title" class="setup-form-panel__title">
              Club setup
            </h4>
            <p class="setup-form-panel__copy">
              Save the anchor record that future training plans and rosters can
              attach to.
            </p>
          </div>

          <div
            v-if="clubSuccessState"
            data-testid="club-success"
            class="message-banner message-banner--success"
            role="status"
          >
            <strong>{{ clubSuccessState.clubName }} saved offline.</strong>
            <span
              >Founding date recorded as
              {{ clubSuccessState.foundingDateLabel }}.</span
            >
          </div>

          <div
            v-if="clubSubmitError"
            data-testid="club-error"
            class="message-banner message-banner--danger"
            role="alert"
          >
            <strong>Save failed.</strong>
            <span>{{ clubSubmitError }}</span>
          </div>

          <form
            class="setup-form"
            data-testid="club-setup-form"
            @submit.prevent="handleClubSubmit"
          >
            <label class="form-control" for="clubName">
              <span class="form-control__label">Club name</span>
              <input
                id="clubName"
                v-model="clubForm.clubName"
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
                v-model="clubForm.foundingDate"
                class="form-control__input"
                name="foundingDate"
                type="date"
                required
              />
            </label>

            <div class="setup-form__footer">
              <p class="setup-form__hint">
                The date is converted to a UTC midnight timestamp before it
                reaches the use case.
              </p>
              <button
                data-testid="club-submit"
                class="button-brand setup-form__submit"
                type="submit"
                :disabled="!canSubmitClub"
              >
                {{ isSubmittingClub ? 'Saving club...' : 'Register club' }}
              </button>
            </div>
          </form>
        </section>

        <section class="setup-form-panel" aria-labelledby="trainer-setup-title">
          <div class="setup-form-panel__heading">
            <h4 id="trainer-setup-title" class="setup-form-panel__title">
              Trainer setup
            </h4>
            <p class="setup-form-panel__copy">
              Save the local trainer identity now so later workflows can build
              around a real owner instead of placeholder data.
            </p>
          </div>

          <div
            v-if="trainerSuccessState"
            data-testid="trainer-success"
            class="message-banner message-banner--success"
            role="status"
          >
            <strong
              >{{ trainerSuccessState.trainerName }} saved offline.</strong
            >
            <span
              >The matching `trainer.created` event was recorded locally.</span
            >
          </div>

          <div
            v-if="trainerSubmitError"
            data-testid="trainer-error"
            class="message-banner message-banner--danger"
            role="alert"
          >
            <strong>Save failed.</strong>
            <span>{{ trainerSubmitError }}</span>
          </div>

          <form
            class="setup-form"
            data-testid="trainer-setup-form"
            @submit.prevent="handleTrainerSubmit"
          >
            <label class="form-control" for="trainerName">
              <span class="form-control__label">Trainer name</span>
              <input
                id="trainerName"
                v-model="trainerForm.trainerName"
                class="form-control__input"
                name="trainerName"
                type="text"
                autocomplete="name"
                placeholder="Jane Doe"
                required
              />
            </label>

            <div class="setup-form__footer">
              <p class="setup-form__hint">
                The trainer is saved through the same shared UI seam, so the
                view never imports storage adapters directly.
              </p>
              <button
                data-testid="trainer-submit"
                class="button-brand setup-form__submit"
                type="submit"
                :disabled="!canSubmitTrainer"
              >
                {{
                  isSubmittingTrainer ? 'Saving trainer...' : 'Register trainer'
                }}
              </button>
            </div>
          </form>
        </section>
      </div>
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
      <p class="setup-card__eyebrow">After each save</p>
      <h3 class="setup-card__subtitle">What the local setup writes</h3>
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

.setup-form-stack {
  display: grid;
  gap: 1rem;
  margin-top: 1.35rem;
}

.setup-form-panel {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(16, 59, 55, 0.08);
  background:
    linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.82),
      rgba(247, 240, 223, 0.7)
    ),
    rgba(255, 255, 255, 0.72);
}

.setup-form-panel__heading {
  display: grid;
  gap: 0.45rem;
}

.setup-form-panel__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
}

.setup-form-panel__copy {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.55;
}

.setup-form__footer {
  display: grid;
  gap: 0.85rem;
}

.setup-form__submit {
  width: 100%;
  justify-content: center;
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

  .setup-card--deep {
    grid-column: 1 / -1;
  }

  .setup-form__submit {
    width: auto;
    min-width: 12rem;
  }
}
</style>
