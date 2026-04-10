import { describe, expect, it } from 'vitest'

import { BrowserSmsComposer } from '@/infra/BrowserSmsComposer'

describe('BrowserSmsComposer', () => {
  it('builds an Android-style sms uri with ?body=', async () => {
    const browserWindow = createBrowserWindow(
      'Mozilla/5.0 (Linux; Android 14; Pixel)'
    )
    const composer = new BrowserSmsComposer(browserWindow)

    await composer.openDraft({
      phoneNumber: '+48 111 222 333',
      message: 'hello coach'
    })

    expect(browserWindow.location.href).toBe(
      'sms:+48111222333?body=hello%20coach'
    )
  })

  it('builds an iOS-style sms uri with &body=', async () => {
    const browserWindow = createBrowserWindow(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    )
    const composer = new BrowserSmsComposer(browserWindow)

    await composer.openDraft({
      phoneNumber: '+48 111 222 333',
      message: 'hello coach'
    })

    expect(browserWindow.location.href).toBe(
      'sms:+48111222333&body=hello%20coach'
    )
  })
})

function createBrowserWindow(userAgent: string) {
  return {
    location: {
      href: ''
    },
    navigator: {
      userAgent
    }
  }
}
