import { describe, expect, it, vi } from 'vitest'

import { ExportDatabaseBackupUseCase } from '@/application/ExportDatabaseBackupUseCase'
import type { BackupFileDeliveryPort } from '@/application/ports/BackupFileDeliveryPort'
import type { ClockPort } from '@/application/ports/ClockPort'
import type { DatabaseBackupExportPort } from '@/application/ports/DatabaseBackupExportPort'

describe('ExportDatabaseBackupUseCase', () => {
  it('exports the backup blob and delivers it as a dated json file', async () => {
    const backupExport: DatabaseBackupExportPort = {
      exportBackupBlob: vi
        .fn()
        .mockResolvedValue(new Blob(['{"club":"Tiger Club"}']))
    }
    const backupDelivery: BackupFileDeliveryPort = {
      deliver: vi.fn().mockResolvedValue({
        method: 'share'
      })
    }
    const clock: ClockPort = {
      now: vi.fn(() => new Date('2026-04-10T14:20:00+02:00'))
    }
    const useCase = new ExportDatabaseBackupUseCase(
      backupExport,
      backupDelivery,
      clock
    )

    const deliveryResult = await useCase.handle({})

    expect(backupExport.exportBackupBlob).toHaveBeenCalledTimes(1)
    expect(backupDelivery.deliver).toHaveBeenCalledTimes(1)

    const deliveredFile = vi.mocked(backupDelivery.deliver).mock.calls[0][0]

    expect(deliveredFile.name).toBe('zeszyt-trenera-backup-2026-04-10.json')
    expect(deliveredFile.type).toBe('application/json')
    await expect(deliveredFile.text()).resolves.toContain('"club":"Tiger Club"')
    expect(deliveryResult).toEqual({
      method: 'share'
    })
  })
})
