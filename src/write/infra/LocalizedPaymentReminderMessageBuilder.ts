import type {
  BuildPaymentReminderMessageInput,
  PaymentReminderMessageBuilderPort
} from '@/write/application/ports/PaymentReminderMessageBuilderPort'

//if there will be more languages, then it should be refactored to strategy pattern
export class LocalizedPaymentReminderMessageBuilder implements PaymentReminderMessageBuilderPort {
  public build({
    trainerName,
    clubName,
    coveredMonth,
    locale
  }: BuildPaymentReminderMessageInput): string {
    const reminderLocale = resolveReminderLocale(locale)
    const monthLabel = formatCoveredMonth(coveredMonth, reminderLocale)

    if (reminderLocale === 'pl') {
      return `Cześć, tu ${trainerName} z ${clubName},\nPrzypominam o składce za ${monthLabel}.`
    }

    // Why: reminders default to a neutral concise English variant for non-Polish locales so coaches keep one predictable fallback across mobile platforms.
    return `Hi, it's ${trainerName} from ${clubName},\nJust a quick reminder that the membership payment for ${monthLabel} is still pending.`
  }
}

function resolveReminderLocale(value: string): 'pl' | 'en' {
  return value.toLowerCase().startsWith('pl') ? 'pl' : 'en'
}

function formatCoveredMonth(coveredMonth: string, locale: 'pl' | 'en'): string {
  const [yearPart, monthPart] = coveredMonth.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return coveredMonth
  }

  if (month < 1 || month > 12) {
    return coveredMonth
  }

  const coveredMonthDate = new Date(Date.UTC(year, month - 1, 1))

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(coveredMonthDate)
}
