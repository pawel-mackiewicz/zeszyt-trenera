import type { Table } from 'dexie'
import { onMounted, ref } from 'vue'

import { db, type TrainerNotebookDb } from '@/db'

export type IndexedDbTableSnapshot = {
  name: string
  primaryKey: string
  indexes: string[]
  rowCount: number
  columns: string[]
  rows: Array<Record<string, unknown>>
}

export type IndexedDbSnapshot = {
  databaseName: string
  schemaVersion: number
  tableSnapshots: IndexedDbTableSnapshot[]
}

export type IndexedDbInspectorErrorKind = 'inspect' | 'clear'

function normalizeRow(row: unknown): Record<string, unknown> {
  if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
    return row as Record<string, unknown>
  }

  return { value: row }
}

function collectColumns(rows: Array<Record<string, unknown>>): string[] {
  const columns = new Set<string>()

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key)
    }
  }

  return [...columns]
}

async function inspectTable(table: Table): Promise<IndexedDbTableSnapshot> {
  const rows = (await table.toArray()).map((row) => normalizeRow(row))

  return {
    name: table.name,
    primaryKey: table.schema.primKey.name ?? '(none)',
    indexes: table.schema.indexes.map((index) => index.name),
    rowCount: rows.length,
    columns: collectColumns(rows),
    rows
  }
}

export async function inspectIndexedDb(
  database: TrainerNotebookDb
): Promise<IndexedDbSnapshot> {
  if (!database.isOpen()) {
    await database.open()
  }

  const tableSnapshots = await Promise.all(
    database.tables.map((table) => inspectTable(table))
  )

  return {
    databaseName: database.name,
    schemaVersion: database.verno,
    tableSnapshots
  }
}

export async function clearIndexedDb(
  database: TrainerNotebookDb
): Promise<void> {
  if (!database.isOpen()) {
    await database.open()
  }

  // Clearing declared stores instead of deleting the whole database keeps the schema available for the next debug snapshot.
  // The debug flow reloads immediately after reset, so individual clears avoid Dexie transaction timing issues without changing the end result.
  for (const table of database.tables) {
    await table.clear()
  }
}

export async function clearIndexedDbTable(
  database: TrainerNotebookDb,
  tableName: string
): Promise<void> {
  if (!database.isOpen()) {
    await database.open()
  }

  const table = database.tables.find(
    (candidate) => candidate.name === tableName
  )

  if (!table) {
    throw new Error(`IndexedDB table "${tableName}" was not found.`)
  }

  // What: clear only one selected object store. Why: the debug workflow often needs a focused local reset while preserving the rest of offline data.
  await table.clear()
}

export function useIndexedDbInspector(database: TrainerNotebookDb = db) {
  const databaseName = ref(database.name)
  const schemaVersion = ref(database.verno)
  const tableSnapshots = ref<Array<IndexedDbTableSnapshot>>([])
  const loading = ref(false)
  const clearing = ref(false)
  const clearingTableName = ref<string | null>(null)
  // What: expose a stable error kind instead of final copy. Why: the debug screen should own the wording for failures that only it renders.
  const errorKind = ref<IndexedDbInspectorErrorKind | null>(null)

  async function reload() {
    loading.value = true
    errorKind.value = null

    try {
      const snapshot = await inspectIndexedDb(database)
      databaseName.value = snapshot.databaseName
      schemaVersion.value = snapshot.schemaVersion
      tableSnapshots.value = snapshot.tableSnapshots
    } catch (reason: unknown) {
      errorKind.value = 'inspect'
      console.error('Failed to inspect IndexedDB tables.', reason)
    } finally {
      loading.value = false
    }
  }

  async function clearDatabase() {
    clearing.value = true
    errorKind.value = null

    try {
      await clearIndexedDb(database)
      await reload()
    } catch (reason: unknown) {
      errorKind.value = 'clear'
      console.error('Failed to clear IndexedDB tables.', reason)
    } finally {
      clearing.value = false
    }
  }

  async function clearTable(tableName: string) {
    clearingTableName.value = tableName
    errorKind.value = null

    try {
      await clearIndexedDbTable(database, tableName)
      await reload()
    } catch (reason: unknown) {
      errorKind.value = 'clear'
      console.error(`Failed to clear IndexedDB table "${tableName}".`, reason)
    } finally {
      clearingTableName.value = null
    }
  }

  onMounted(() => {
    void reload()
  })

  return {
    databaseName,
    schemaVersion,
    tableSnapshots,
    loading,
    clearing,
    clearingTableName,
    errorKind,
    reload,
    clearDatabase,
    clearTable
  }
}
