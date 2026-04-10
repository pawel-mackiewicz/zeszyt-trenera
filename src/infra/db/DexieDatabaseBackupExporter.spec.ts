import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { DexieDatabaseBackupExporter } from '@/infra/db/DexieDatabaseBackupExporter'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

type DexieExportBackup = {
  formatName: string
  data: {
    databaseName: string
    tables: Array<{
      name: string
      rowCount: number
    }>
  }
}

describe('DexieDatabaseBackupExporter', () => {
  let database: TrainerNotebookDb
  let backupExporter: DexieDatabaseBackupExporter

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('database-backup-export'))
    backupExporter = new DexieDatabaseBackupExporter(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('exports Dexie data as a json backup blob', async () => {
    await database.clubs.add({
      id: 'club-1',
      name: 'Tiger Club',
      foundingDate: new Date('2001-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z')
    })
    await database.trainers.add({
      id: 'trainer-1',
      name: 'Jane Doe',
      createdAt: new Date('2026-01-01T00:00:00Z')
    })

    const backupBlob = await backupExporter.exportBackupBlob()
    const parsedBackup = JSON.parse(
      await backupBlob.text()
    ) as DexieExportBackup
    const clubsTable = parsedBackup.data.tables.find(
      (table) => table.name === 'clubs'
    )
    const trainersTable = parsedBackup.data.tables.find(
      (table) => table.name === 'trainers'
    )

    expect(parsedBackup.formatName).toBe('dexie')
    expect(parsedBackup.data.databaseName).toBe(database.name)
    expect(clubsTable?.rowCount).toBe(1)
    expect(trainersTable?.rowCount).toBe(1)
  })
})
