import { exportDB } from 'dexie-export-import'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import {
  BackupDatabaseNameMismatchError,
  DexieDatabaseBackupImporter
} from '@/write/infra/db/DexieDatabaseBackupImporter'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieDatabaseBackupImporter', () => {
  let targetDatabase: TrainerNotebookDb
  let backupImporter: DexieDatabaseBackupImporter

  beforeEach(async () => {
    targetDatabase = new TrainerNotebookDb(createTestDbName('backup-import'))
    backupImporter = new DexieDatabaseBackupImporter(targetDatabase)

    await targetDatabase.open()
  })

  afterEach(async () => {
    targetDatabase.close()
    await targetDatabase.delete()
  })

  it('imports a backup file into the current notebook and clears stale rows', async () => {
    await targetDatabase.clubs.add({
      id: 'club-imported',
      name: 'Imported Club',
      foundingDate: new Date('2002-01-01T00:00:00Z'),
      createdAt: new Date('2026-02-01T00:00:00Z')
    })
    await targetDatabase.trainers.add({
      id: 'trainer-imported',
      name: 'Imported Trainer',
      createdAt: new Date('2026-02-01T00:00:00Z')
    })

    const backupBlob = await exportDB(targetDatabase)
    const backupFile = new File([backupBlob], 'backup.json', {
      type: 'application/json'
    })

    await targetDatabase.clubs.clear()
    await targetDatabase.trainers.clear()

    await targetDatabase.clubs.add({
      id: 'club-local-old',
      name: 'Old Local Club',
      foundingDate: new Date('1998-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z')
    })

    await backupImporter.importBackupFile(backupFile)

    await expect(
      targetDatabase.clubs.get('club-local-old')
    ).resolves.toBeFalsy()
    await expect(
      targetDatabase.clubs.get('club-imported')
    ).resolves.toMatchObject({
      id: 'club-imported',
      name: 'Imported Club'
    })
    await expect(
      targetDatabase.trainers.get('trainer-imported')
    ).resolves.toMatchObject({
      id: 'trainer-imported',
      name: 'Imported Trainer'
    })
  })

  it('keeps existing rows when a corrupted backup fails during import', async () => {
    await targetDatabase.clubs.add({
      id: 'club-local-safe',
      name: 'Safe Local Club',
      foundingDate: new Date('2000-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-10T00:00:00Z')
    })
    const corruptedBackupFile = new File(['{not-valid-json'], 'backup.json', {
      type: 'application/json'
    })

    await expect(
      backupImporter.importBackupFile(corruptedBackupFile)
    ).rejects.toBeInstanceOf(Error)
    await expect(targetDatabase.clubs.toArray()).resolves.toMatchObject([
      {
        id: 'club-local-safe',
        name: 'Safe Local Club'
      }
    ])
  })

  it('rejects a backup exported from another database name', async () => {
    const foreignDatabase = new TrainerNotebookDb(
      createTestDbName('backup-import-foreign')
    )

    await targetDatabase.clubs.add({
      id: 'club-local-safe',
      name: 'Safe Local Club',
      foundingDate: new Date('2000-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-10T00:00:00Z')
    })
    await foreignDatabase.open()

    try {
      await foreignDatabase.clubs.add({
        id: 'club-foreign',
        name: 'Foreign Club',
        foundingDate: new Date('2001-01-01T00:00:00Z'),
        createdAt: new Date('2026-01-11T00:00:00Z')
      })

      const foreignBackupBlob = await exportDB(foreignDatabase)
      const foreignBackupFile = new File([foreignBackupBlob], 'backup.json', {
        type: 'application/json'
      })

      await expect(
        backupImporter.importBackupFile(foreignBackupFile)
      ).rejects.toBeInstanceOf(BackupDatabaseNameMismatchError)
    } finally {
      foreignDatabase.close()
      await foreignDatabase.delete()
    }

    await expect(targetDatabase.clubs.toArray()).resolves.toMatchObject([
      {
        id: 'club-local-safe',
        name: 'Safe Local Club'
      }
    ])
  })
})
