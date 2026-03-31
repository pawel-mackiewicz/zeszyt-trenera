<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { db, type TrainerNotebookDb } from '@/db'
import { useIndexedDbInspector } from '@/ui/composables/useIndexedDbInspector'

const props = defineProps<{
  database?: TrainerNotebookDb
}>()
const { t } = useI18n({ useScope: 'local' })

const {
  databaseName,
  schemaVersion,
  tableSnapshots,
  loading,
  clearing,
  errorKind,
  reload,
  clearDatabase
} = useIndexedDbInspector(props.database ?? db)

const tableCount = computed(() => tableSnapshots.value.length)
const totalRows = computed(() =>
  tableSnapshots.value.reduce((sum, table) => sum + table.rowCount, 0)
)
const busy = computed(() => loading.value || clearing.value)
// What: keep debug failure copy inside this screen. Why: the inspector is the only place that can explain these local recovery steps to the user.
const errorEyebrow = computed(() => t('errors.eyebrow'))
const errorTitle = computed(() => t('errors.title'))
const errorMessage = computed(() =>
  errorKind.value === null ? '' : t(`errors.${errorKind.value}`)
)

function isComplexValue(value: unknown) {
  return value !== null && typeof value === 'object' && !(value instanceof Date)
}

function formatCellValue(value: unknown) {
  if (value === undefined) {
    return '—'
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (isComplexValue(value)) {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function handleClearDatabase() {
  // The browser confirmation reduces the chance of wiping local test data by accident from a screen meant for quick inspection.
  if (
    !window.confirm(
      'Clear all IndexedDB rows for this app in this browser? This cannot be undone.'
    )
  ) {
    return
  }

  void clearDatabase()
}
</script>

<template>
  <section class="debug-grid">
    <article class="debug-card debug-card--hero">
      <div class="debug-card__topline">
        <div>
          <p class="debug-card__eyebrow">Storage snapshot</p>
          <h2 class="debug-card__title">
            IndexedDB tables, as they exist in this browser.
          </h2>
        </div>

        <div class="debug-card__actions">
          <button
            class="debug-card__action"
            type="button"
            :disabled="busy"
            @click="reload"
          >
            {{ loading ? 'Refreshing…' : 'Refresh snapshot' }}
          </button>
          <button
            class="debug-card__action debug-card__action--danger"
            type="button"
            :disabled="busy"
            @click="handleClearDatabase"
          >
            {{ clearing ? 'Clearing…' : 'Clear database' }}
          </button>
        </div>
      </div>

      <p class="debug-card__copy">
        Inspect the declared Dexie object stores, or wipe every stored row in
        this browser when you need a clean local state without touching the
        schema.
      </p>

      <div class="debug-stats" aria-label="Database summary">
        <div class="debug-stat">
          <span>Database</span>
          <strong>{{ databaseName }}</strong>
        </div>
        <div class="debug-stat">
          <span>Schema version</span>
          <strong>{{ schemaVersion }}</strong>
        </div>
        <div class="debug-stat">
          <span>Declared tables</span>
          <strong>{{ tableCount }}</strong>
        </div>
        <div class="debug-stat">
          <span>Total rows</span>
          <strong>{{ totalRows }}</strong>
        </div>
      </div>
    </article>

    <article v-if="errorKind" class="debug-card debug-card--error" role="alert">
      <p class="debug-card__eyebrow">{{ errorEyebrow }}</p>
      <h2 class="debug-card__title debug-card__title--small">
        {{ errorTitle }}
      </h2>
      <p class="debug-card__copy">{{ errorMessage }}</p>
    </article>

    <article
      v-for="table in tableSnapshots"
      :key="table.name"
      class="debug-card debug-card--table"
    >
      <div class="debug-table-card__header">
        <div>
          <p class="debug-card__eyebrow">Object store</p>
          <h2 class="debug-card__title debug-card__title--small">
            {{ table.name }}
          </h2>
        </div>

        <div class="debug-badges">
          <span class="debug-badge">{{ table.rowCount }} rows</span>
          <span class="debug-badge debug-badge--soft">
            PK: {{ table.primaryKey }}
          </span>
        </div>
      </div>

      <dl class="debug-schema">
        <div class="debug-schema__row">
          <dt>Indexes</dt>
          <dd>
            <div v-if="table.indexes.length > 0" class="debug-index-list">
              <span
                v-for="index in table.indexes"
                :key="`${table.name}-${index}`"
                class="debug-index"
              >
                {{ index }}
              </span>
            </div>
            <span v-else class="debug-schema__empty">No secondary indexes</span>
          </dd>
        </div>
        <div class="debug-schema__row">
          <dt>Columns in snapshot</dt>
          <dd>
            <div v-if="table.columns.length > 0" class="debug-index-list">
              <span
                v-for="column in table.columns"
                :key="`${table.name}-${column}`"
                class="debug-index debug-index--column"
              >
                {{ column }}
              </span>
            </div>
            <span v-else class="debug-schema__empty">No rows loaded yet</span>
          </dd>
        </div>
      </dl>

      <p v-if="table.rowCount === 0" class="debug-empty">
        No records stored in this table yet.
      </p>

      <div v-else class="debug-table-scroll">
        <table class="debug-table">
          <caption class="visually-hidden">
            {{
              table.name
            }}
            IndexedDB snapshot
          </caption>
          <thead>
            <tr>
              <th
                v-for="column in table.columns"
                :key="`${table.name}-head-${column}`"
                scope="col"
              >
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in table.rows"
              :key="`${table.name}-row-${rowIndex}`"
            >
              <td
                v-for="column in table.columns"
                :key="`${table.name}-cell-${rowIndex}-${column}`"
              >
                <pre
                  v-if="isComplexValue(row[column])"
                  class="debug-cell debug-cell--code"
                  >{{ formatCellValue(row[column]) }}</pre
                >
                <span v-else class="debug-cell">
                  {{ formatCellValue(row[column]) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

<style scoped>
.debug-grid {
  display: grid;
  gap: 1rem;
}

.debug-card {
  position: relative;
  overflow: hidden;
  padding: 1.35rem;
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
  background: var(--bg-panel);
  box-shadow: var(--shadow-soft);
}

.debug-card--hero {
  background:
    radial-gradient(
      circle at top right,
      rgba(77, 128, 146, 0.18),
      transparent 32%
    ),
    linear-gradient(
      145deg,
      rgba(255, 251, 243, 0.96),
      rgba(220, 230, 215, 0.8)
    ),
    var(--bg-panel);
}

.debug-card--hero::after {
  content: '';
  position: absolute;
  inset: auto -3rem -4.5rem auto;
  width: 12rem;
  height: 12rem;
  border-radius: 2.2rem;
  background: linear-gradient(
    145deg,
    rgba(15, 107, 87, 0.16),
    rgba(199, 106, 43, 0.18)
  );
  transform: rotate(18deg);
}

.debug-card--error {
  background:
    linear-gradient(
      140deg,
      rgba(255, 246, 242, 0.96),
      rgba(250, 224, 216, 0.84)
    ),
    var(--bg-panel);
  border-color: rgba(161, 63, 48, 0.2);
}

.debug-card--table {
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.56),
      rgba(255, 251, 243, 0.72)
    ),
    var(--bg-panel);
}

.debug-card__topline,
.debug-stats,
.debug-card__copy {
  position: relative;
  z-index: 1;
}

.debug-card__topline,
.debug-table-card__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.debug-card__eyebrow {
  margin: 0 0 0.55rem;
  color: var(--accent);
  font: 700 0.82rem/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.debug-card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.85rem, 5.2vw, 2.8rem);
  line-height: 0.96;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.debug-card__title--small {
  font-size: 1.6rem;
}

.debug-card__copy {
  max-width: 46rem;
  margin: 1rem 0 0;
  color: var(--ink-soft);
  line-height: 1.6;
}

.debug-card__action {
  min-height: 2.9rem;
  padding: 0 1rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--accent-strong), var(--accent));
  color: #f6f1e5;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(16, 59, 55, 0.22);
  transition:
    transform var(--speed-fast) var(--ease-standard),
    box-shadow var(--speed-fast) var(--ease-standard),
    opacity var(--speed-fast) var(--ease-standard);
}

.debug-card__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.debug-card__action--danger {
  background: linear-gradient(135deg, rgba(161, 63, 48, 0.94), #7c2418);
  box-shadow: 0 10px 24px rgba(124, 36, 24, 0.18);
}

.debug-card__action:hover,
.debug-card__action:focus-visible {
  transform: translateY(-1px);
}

.debug-card__action:focus-visible {
  outline: 2px solid var(--accent-hot);
  outline-offset: 2px;
}

.debug-card__action:disabled {
  cursor: wait;
  opacity: 0.72;
}

.debug-stats {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.35rem;
}

.debug-stat {
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(16, 59, 55, 0.08);
}

.debug-stat span,
.debug-stat strong {
  display: block;
}

.debug-stat span {
  color: var(--ink-soft);
  font-size: 0.88rem;
}

.debug-stat strong {
  margin-top: 0.3rem;
  font-family: var(--font-display);
  font-size: 1.2rem;
}

.debug-badges,
.debug-index-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.debug-badge,
.debug-index {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0 0.8rem;
  border-radius: var(--radius-pill);
  background: rgba(16, 59, 55, 0.08);
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 700;
}

.debug-badge--soft,
.debug-index--column {
  background: rgba(77, 128, 146, 0.1);
}

.debug-schema {
  display: grid;
  gap: 0.8rem;
  margin-top: 1rem;
}

.debug-schema__row {
  display: grid;
  gap: 0.55rem;
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.58);
}

.debug-schema__row dt {
  color: var(--ink-soft);
  font-weight: 700;
}

.debug-schema__row dd {
  margin: 0;
}

.debug-schema__empty,
.debug-empty {
  color: var(--ink-soft);
}

.debug-empty {
  margin: 1rem 0 0;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.48);
}

.debug-table-scroll {
  margin-top: 1rem;
  overflow-x: auto;
  border-radius: 1rem;
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: rgba(255, 255, 255, 0.62);
}

.debug-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
}

.debug-table th,
.debug-table td {
  padding: 0.95rem 1rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(16, 59, 55, 0.1);
}

.debug-table th {
  background: rgba(16, 59, 55, 0.08);
  font: 700 0.82rem/1.2 var(--font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.debug-table tbody tr:nth-child(even) td {
  background: rgba(220, 230, 215, 0.18);
}

.debug-table tbody tr:last-child td {
  border-bottom: 0;
}

.debug-cell {
  display: block;
  max-width: 24rem;
  line-height: 1.5;
  word-break: break-word;
}

.debug-cell--code {
  margin: 0;
  padding: 0.7rem 0.8rem;
  border-radius: 0.9rem;
  background: rgba(16, 59, 55, 0.08);
  color: var(--accent-strong);
  font:
    600 0.82rem/1.5 ui-monospace,
    SFMono-Regular,
    'SF Mono',
    Consolas,
    'Liberation Mono',
    monospace;
  white-space: pre-wrap;
}

@media (min-width: 860px) {
  .debug-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .debug-card--hero,
  .debug-card--error {
    grid-column: 1 / -1;
  }

  .debug-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .debug-card__topline,
  .debug-table-card__header {
    flex-direction: column;
  }

  .debug-card__actions {
    width: 100%;
  }

  .debug-card__action {
    width: 100%;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "errors": {
      "eyebrow": "Błąd podglądu",
      "title": "Nie udało się odczytać IndexedDB.",
      "inspect": "Nie udało się odczytać tabel IndexedDB.",
      "clear": "Nie udało się wyczyścić tabel IndexedDB."
    }
  },
  "en": {
    "errors": {
      "eyebrow": "Inspection failed",
      "title": "IndexedDB could not be read.",
      "inspect": "Failed to inspect IndexedDB tables.",
      "clear": "Failed to clear IndexedDB tables."
    }
  }
}
</i18n>
