import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrowserBackupFileDelivery } from '@/infra/BrowserBackupFileDelivery'

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

    await expect(delivery.deliver(file)).resolves.toEqual({
      method: 'share'
    })

    expect(canShare).toHaveBeenCalledWith({ files: [file] })
    expect(share).toHaveBeenCalledWith({ files: [file] })
    expect(environment.browserUrl.createObjectURL).not.toHaveBeenCalled()
  })

  it('keeps navigator context when invoking share', async () => {
    const canShare = vi.fn().mockReturnValue(true)
    const browserNavigator: ShareNavigator = {
      canShare,
      share(this: ShareNavigator) {
        // Why: this guards against regressions where `navigator.share` is detached and called without its required receiver.
        if (this !== browserNavigator) {
          throw new TypeError('Illegal invocation')
        }

        return Promise.resolve(undefined)
      }
    }
    const environment = createEnvironment({
      browserNavigator
    })
    const delivery = new BrowserBackupFileDelivery(environment)
    const file = new File(['{"hello":"world"}'], 'backup.json', {
      type: 'application/json'
    })

    await expect(delivery.deliver(file)).resolves.toEqual({
      method: 'share'
    })

    expect(canShare).toHaveBeenCalledWith({ files: [file] })
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

    await expect(delivery.deliver(file)).resolves.toEqual({
      method: 'download',
      reasonCode: 'share-api-unavailable',
      reasonDetails: 'navigator.share is unavailable'
    })

    expect(environment.browserUrl.createObjectURL).toHaveBeenCalledWith(file)
    expect(environment.browserUrl.revokeObjectURL).toHaveBeenCalledWith(
      'blob:backup-url'
    )
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back to object-url download when canShare rejects file payload support', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const environment = createEnvironment({
      browserNavigator: {
        canShare: vi.fn().mockReturnValue(false),
        share: vi.fn()
      }
    })
    const delivery = new BrowserBackupFileDelivery(environment)
    const file = new File(['{}'], 'backup.json', {
      type: 'application/json'
    })

    await expect(delivery.deliver(file)).resolves.toEqual({
      method: 'download',
      reasonCode: 'share-capability-returned-false',
      reasonDetails: 'navigator.canShare({ files }) returned false'
    })

    expect(environment.browserUrl.createObjectURL).toHaveBeenCalledWith(file)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(environment.browserNavigator.share).not.toHaveBeenCalled()
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

    await expect(delivery.deliver(file)).resolves.toEqual({
      method: 'download',
      reasonCode: 'share-capability-check-failed',
      reasonDetails: 'TypeError: files are not shareable'
    })

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

    await expect(delivery.deliver(file)).resolves.toEqual({
      method: 'share'
    })
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

    await expect(delivery.deliver(file)).resolves.toEqual({
      method: 'download',
      reasonCode: 'share-rejected-capability-error',
      reasonDetails: 'NotAllowedError: Gesture required'
    })

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
