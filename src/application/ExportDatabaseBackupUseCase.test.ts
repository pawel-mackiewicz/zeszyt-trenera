import { describe, expect, it, vi } from 'vitest'

import { ExportDatabaseBackupUseCase } from '@/application/ExportDatabaseBackupUseCase'
import type { ClockPort } from '@/application/ports/ClockPort'
import type { DatabaseBackupExportPort } from '@/application/ports/DatabaseBackupExportPort'

describe('ExportDatabaseBackupUseCase', () => {
  it('exports the backup blob and wraps it into a dated json file', async () => {
    const backupExport: DatabaseBackupExportPort = {
      exportBackupBlob: vi
        .fn()
        .mockResolvedValue(new Blob(['{"club":"Tiger Club"}']))
    }
    const clock: ClockPort = {
      now: vi.fn(() => new Date('2026-04-10T14:20:00+02:00'))
    }
    const useCase = new ExportDatabaseBackupUseCase(backupExport, clock)

    const backupFile = await useCase.handle({})

    expect(backupExport.exportBackupBlob).toHaveBeenCalledTimes(1)
    expect(backupFile.name).toBe('zeszyt-trenera-backup-2026-04-10.json')
    expect(backupFile.type).toBe('application/json')
    await expect(backupFile.text()).resolves.toContain('"club":"Tiger Club"')
  })
})
