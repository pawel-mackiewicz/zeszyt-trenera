import type {
  SmsComposerPort,
  SmsDraft
} from '@/application/ports/SmsComposerPort'

type BrowserSmsWindow = {
  location: {
    href: string
  }
  navigator: {
    userAgent: string
  }
}

export class BrowserSmsComposer implements SmsComposerPort {
  public constructor(
    private readonly browserWindow: BrowserSmsWindow = window
  ) {}

  public async openDraft(draft: SmsDraft): Promise<void> {
    const encodedMessage = encodeURIComponent(draft.message)
    const normalizedPhoneNumber = draft.phoneNumber.replace(/\s+/g, '')
    // Why: iOS expects `sms:number&body=...` while most other mobile browsers use `sms:number?body=...`, so one adapter branch keeps the use case platform-agnostic.
    const querySeparator = isAppleSmsScheme(
      this.browserWindow.navigator.userAgent
    )
      ? '&'
      : '?'

    this.browserWindow.location.href = `sms:${normalizedPhoneNumber}${querySeparator}body=${encodedMessage}`
  }
}

function isAppleSmsScheme(userAgent: string): boolean {
  const normalizedUserAgent = userAgent.toLowerCase()

  return (
    normalizedUserAgent.includes('iphone') ||
    normalizedUserAgent.includes('ipad') ||
    normalizedUserAgent.includes('ipod')
  )
}
