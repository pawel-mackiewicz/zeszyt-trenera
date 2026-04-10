import { describe, expect, it, vi } from 'vitest'

import { ImportDatabaseBackupUseCase } from '@/application/ImportDatabaseBackupUseCase'
import type { DatabaseBackupImportPort } from '@/application/ports/DatabaseBackupImportPort'

describe('ImportDatabaseBackupUseCase', () => {
  it('imports the selected backup file through the import port', async () => {
    const backupImport: DatabaseBackupImportPort = {
      importBackupFile: vi.fn().mockResolvedValue(undefined)
    }
    const useCase = new ImportDatabaseBackupUseCase(backupImport)
    const backupFile = new File(['{"formatName":"dexie"}'], 'backup.json', {
      type: 'application/json'
    })

    await useCase.handle({
      backupFile
    })

    expect(backupImport.importBackupFile).toHaveBeenCalledTimes(1)
    expect(backupImport.importBackupFile).toHaveBeenCalledWith(backupFile)
  })
})
