import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrowserBackupFileDelivery } from '@/system_management/database_backup/infra/BrowserBackupFileDelivery'

type ShareNavigator = {
  canShare?: Navigator['canShare']
  share?: Navigator['share']
}

function createEnvironment(
  overrides: {
    browserNavigator?: ShareNavigator
    createObjectUrl?: string
  } = {}
) {
  const browserNavigator: ShareNavigator = overrides.browserNavigator ?? {}
  const createObjectURL = vi
    .fn()
    .mockReturnValue(overrides.createObjectUrl ?? 'blob:backup-url')
  const revokeObjectURL = vi.fn()

  return {
    browserDocument: document,
    browserNavigator,
    browserUrl: {
      createObjectURL,
      revokeObjectURL
    }
  }
}

describe('BrowserBackupFileDelivery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the native share sheet when file sharing is available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const canShare = vi.fn().mockReturnValue(true)
    const environment = createEnvironment({
      browserNavigator: { canShare, share }
    })
    const delivery = new BrowserBackupFileDelivery(environment)
    const file = new File(['{"hello":"world"}'], 'backup.json', {
      type: 'application/json'
    })

    await delivery.deliver(file)

    expect(canShare).toHaveBeenCalledWith({ files: [file] })
    expect(share).toHaveBeenCalledWith({ files: [file] })
    expect(environment.browserUrl.createObjectURL).not.toHaveBeenCalled()
  })

  it('falls back to object-url download when file sharing is unavailable', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const environment = createEnvironment({
      browserNavigator: { canShare: vi.fn().mockReturnValue(false) }
    })
    const delivery = new BrowserBackupFileDelivery(environment)
    const file = new File(['{"hello":"world"}'], 'backup.json', {
      type: 'application/json'
    })

    await delivery.deliver(file)

    expect(environment.browserUrl.createObjectURL).toHaveBeenCalledWith(file)
    expect(environment.browserUrl.revokeObjectURL).toHaveBeenCalledWith(
      'blob:backup-url'
    )
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back to object-url download when canShare throws on files payload', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const environment = createEnvironment({
      browserNavigator: {
        canShare: vi.fn().mockImplementation(() => {
          throw new TypeError('files are not shareable')
        }),
        share: vi.fn()
      }
    })
    const delivery = new BrowserBackupFileDelivery(environment)
    const file = new File(['{}'], 'backup.json', {
      type: 'application/json'
    })

    await expect(delivery.deliver(file)).resolves.toBeUndefined()

    expect(environment.browserUrl.createObjectURL).toHaveBeenCalledWith(file)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(environment.browserNavigator.share).not.toHaveBeenCalled()
  })

  it('silently ignores AbortError when the share sheet is dismissed', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('User dismissed', 'AbortError'))
    const environment = createEnvironment({
      browserNavigator: {
        canShare: vi.fn().mockReturnValue(true),
        share
      }
    })
    const delivery = new BrowserBackupFileDelivery(environment)
    const file = new File(['{}'], 'backup.json', {
      type: 'application/json'
    })

    await expect(delivery.deliver(file)).resolves.toBeUndefined()
  })

  it('falls back to download when share rejects with capability errors', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const share = vi
      .fn()
      .mockRejectedValue(
        new DOMException('Gesture required', 'NotAllowedError')
      )
    const environment = createEnvironment({
      browserNavigator: {
        canShare: vi.fn().mockReturnValue(true),
        share
      }
    })
    const delivery = new BrowserBackupFileDelivery(environment)
    const file = new File(['{}'], 'backup.json', {
      type: 'application/json'
    })

    await expect(delivery.deliver(file)).resolves.toBeUndefined()

    expect(share).toHaveBeenCalledWith({ files: [file] })
    expect(environment.browserUrl.createObjectURL).toHaveBeenCalledWith(file)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('rethrows non-abort share errors', async () => {
    const shareError = new Error('share failed')
    const share = vi.fn().mockRejectedValue(shareError)
    const environment = createEnvironment({
      browserNavigator: {
        canShare: vi.fn().mockReturnValue(true),
        share
      }
    })
    const delivery = new BrowserBackupFileDelivery(environment)
    const file = new File(['{}'], 'backup.json', {
      type: 'application/json'
    })

    await expect(delivery.deliver(file)).rejects.toBe(shareError)
  })
})
