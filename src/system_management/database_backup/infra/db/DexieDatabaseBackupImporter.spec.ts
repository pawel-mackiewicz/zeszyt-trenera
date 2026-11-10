import { exportDB } from 'dexie-export-import'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import {
  givenLegacyNotebook,
  expectNotebookRowsToMatch
} from '@/test/fixtures/legacyNotebook'
import {
  BackupDatabaseNameMismatchError,
  DexieDatabaseBackupImporter
} from '@/system_management/database_backup/infra/db/DexieDatabaseBackupImporter'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

async function givenLargeRosterBackup(database: TrainerNotebookDb) {
  const createdAt = new Date('2026-03-01T10:00:00Z')
  const members = Array.from({ length: 8000 }, (_, index) => ({
    id: `member-${String(index).padStart(4, '0')}`,
    firstName: 'jane',
    lastName: 'doe',
    dateOfBirth: new Date(Date.UTC(1990, 0, index + 1)),
    archived: false,
    createdAt
  }))
  await database.members.bulkAdd(members)
  const backupBlob = await exportDB(database)

  return {
    backupFile: new File([backupBlob], 'large-roster-backup.json'),
    members
  }
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

  it('restores every record from an older backup while discarding its event log', async () => {
    await targetDatabase.delete()
    const { database: legacyDatabase, savedRows } = await givenLegacyNotebook(
      targetDatabase.name
    )
    const backupBlob = await exportDB(legacyDatabase)
    legacyDatabase.close()
    await targetDatabase.open()
    await targetDatabase.clubs.put({
      id: 'stale-club',
      name: 'Stale club',
      foundingDate: new Date(),
      createdAt: new Date()
    })

    await backupImporter.importBackupFile(
      new File([backupBlob], 'old-backup.json')
    )

    await expectNotebookRowsToMatch(targetDatabase, savedRows)
  })

  it('restores every member from a large backup and removes stale local records', async () => {
    const { backupFile, members } = await givenLargeRosterBackup(targetDatabase)
    // The file must exceed the importer's default 1 MiB chunk to exercise multiple reads.
    expect(backupFile.size).toBeGreaterThan(1024 * 1024)
    await targetDatabase.members.clear()
    await targetDatabase.members.add({ ...members[0], id: 'stale-member' })

    await backupImporter.importBackupFile(backupFile)

    await expect(targetDatabase.members.toArray()).resolves.toEqual(members)
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
