import { describe, expect, it } from 'vitest'

import { LocalizedPaymentReminderMessageBuilder } from '@/write/infra/LocalizedPaymentReminderMessageBuilder'

describe('LocalizedPaymentReminderMessageBuilder', () => {
  it('builds a Polish reminder for pl locales', () => {
    const messageBuilder = new LocalizedPaymentReminderMessageBuilder()

    expect(
      messageBuilder.build({
        trainerName: 'Jane Doe',
        clubName: 'Tiger Club',
        coveredMonth: '2026-10',
        locale: 'pl-PL'
      })
    ).toBe(
      'Cześć, tu Jane Doe z Tiger Club,\nPrzypominam o składce za październik 2026.'
    )
  })

  it('builds an English reminder for non-pl locales', () => {
    const messageBuilder = new LocalizedPaymentReminderMessageBuilder()

    expect(
      messageBuilder.build({
        trainerName: 'Jane Doe',
        clubName: 'Tiger Club',
        coveredMonth: '2026-10',
        locale: 'en'
      })
    ).toBe(
      "Hi, it's Jane Doe from Tiger Club,\nJust a quick reminder that the membership payment for October 2026 is still pending."
    )
  })

  it('keeps the raw covered month when the format is invalid', () => {
    const messageBuilder = new LocalizedPaymentReminderMessageBuilder()

    expect(
      messageBuilder.build({
        trainerName: 'Jane Doe',
        clubName: 'Tiger Club',
        coveredMonth: '2026/10',
        locale: 'en'
      })
    ).toContain('for 2026/10 is still pending.')
  })
})
