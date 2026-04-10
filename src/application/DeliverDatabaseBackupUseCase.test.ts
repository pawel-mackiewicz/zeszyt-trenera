import { describe, expect, it, vi } from 'vitest'

import { DeliverDatabaseBackupUseCase } from '@/application/DeliverDatabaseBackupUseCase'
import type { BackupFileDeliveryPort } from '@/application/ports/BackupFileDeliveryPort'

describe('DeliverDatabaseBackupUseCase', () => {
  it('hands the prepared backup file to the delivery port', async () => {
    const backupDelivery: BackupFileDeliveryPort = {
      deliver: vi.fn().mockResolvedValue({
        method: 'share'
      })
    }
    const useCase = new DeliverDatabaseBackupUseCase(backupDelivery)
    const backupFile = new File(['{"club":"Tiger Club"}'], 'backup.json', {
      type: 'application/json'
    })

    const deliveryResult = await useCase.handle({
      backupFile
    })

    expect(backupDelivery.deliver).toHaveBeenCalledWith(backupFile)
    expect(deliveryResult).toEqual({
      method: 'share'
    })
  })
})
