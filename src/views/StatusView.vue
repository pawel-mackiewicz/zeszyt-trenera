<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { db } from '@/infra/db'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const { canInstall, dbConnected, installed, isOnline, needRefresh, offlineReady, swRegistered } =
  storeToRefs(appStore)

const runtimeRows = computed(() => [
  {
    label: 'Connectivity',
    value: isOnline.value ? 'Online' : 'Offline'
  },
  {
    label: 'Install action',
    value: canInstall.value ? 'Available' : installed.value ? 'Installed' : 'Hidden'
  },
  {
    label: 'Update signal',
    value: needRefresh.value ? 'Waiting' : offlineReady.value ? 'Current shell cached' : 'Idle'
  },
  {
    label: 'Service worker',
    value: swRegistered.value ? 'Registered' : 'Pending'
  }
])

const storageRows = computed(() => [
  { label: 'Database name', value: db.name },
  { label: 'Schema version', value: String(db.verno) },
  { label: 'Declared tables', value: String(db.tables.length) },
  { label: 'Connection state', value: dbConnected.value ? 'Open' : 'Pending' }
])
</script>

<template>
  <section class="status-grid">
    <article class="status-card">
      <p class="status-card__eyebrow">Runtime</p>
      <h2 class="status-card__title">PWA signals</h2>
      <dl class="status-list">
        <div v-for="row in runtimeRows" :key="row.label" class="status-list__row">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>
    </article>

    <article class="status-card status-card--storage">
      <p class="status-card__eyebrow">Storage</p>
      <h2 class="status-card__title">Dexie bootstrap</h2>
      <dl class="status-list">
        <div v-for="row in storageRows" :key="row.label" class="status-list__row">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>
    </article>
  </section>
</template>

<style scoped>
.status-grid {
  display: grid;
  gap: 1rem;
}

.status-card {
  padding: 1.3rem;
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
  background: var(--bg-panel);
  box-shadow: var(--shadow-soft);
}

.status-card--storage {
  background:
    linear-gradient(150deg, rgba(220, 230, 215, 0.72), rgba(255, 255, 255, 0.88)),
    var(--bg-panel);
}

.status-card__eyebrow {
  margin: 0 0 0.5rem;
  color: var(--accent);
  font: 700 0.82rem/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.status-card__title {
  margin: 0;
  font: 700 1.7rem/1 var(--font-display);
}

.status-list {
  margin: 1rem 0 0;
  display: grid;
  gap: 0.85rem;
}

.status-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.65);
}

.status-list__row dt {
  color: var(--ink-soft);
}

.status-list__row dd {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
}

@media (min-width: 860px) {
  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
</style>
