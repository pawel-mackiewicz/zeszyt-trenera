import { createI18n } from 'vue-i18n'
import { APP_LOCALE_STORAGE_KEY } from '@/appStorageKeys'

export const APP_LOCALES = ['pl', 'en'] as const
export const APP_FALLBACK_LOCALE = 'en' as const
export const APP_DEFAULT_LOCALE = 'pl' as const
export { APP_LOCALE_STORAGE_KEY }

export type AppLocale = (typeof APP_LOCALES)[number]

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>
type LocaleNavigator = Pick<Navigator, 'language'>

export function normalizeAppLocale(
  value: string | null | undefined
): AppLocale | null {
  const normalizedValue = value?.trim().toLowerCase()

  if (!normalizedValue) {
    return null
  }

  if (normalizedValue === 'pl' || normalizedValue.startsWith('pl-')) {
    return 'pl'
  }

  if (normalizedValue === 'en' || normalizedValue.startsWith('en-')) {
    return 'en'
  }

  return null
}

export function readStoredLocale(
  storage: LocaleStorage = window.localStorage
): AppLocale | null {
  try {
    return normalizeAppLocale(storage.getItem(APP_LOCALE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function detectBrowserLocale(
  browserNavigator: LocaleNavigator = window.navigator
): AppLocale {
  return normalizeAppLocale(browserNavigator.language) ?? APP_DEFAULT_LOCALE
}

export function resolveInitialLocale({
  storage = window.localStorage,
  browserNavigator = window.navigator
}: {
  storage?: LocaleStorage
  browserNavigator?: LocaleNavigator
} = {}): AppLocale {
  return readStoredLocale(storage) ?? detectBrowserLocale(browserNavigator)
}

export function persistLocale(
  locale: AppLocale,
  storage: LocaleStorage = window.localStorage
) {
  try {
    // Locale choice is needed before Dexie opens, so a tiny shell preference belongs in localStorage instead of the app database.
    storage.setItem(APP_LOCALE_STORAGE_KEY, locale)
  } catch {
    // The UI should still switch language even if this device blocks persistent storage.
  }
}

export function createAppI18n(locale = resolveInitialLocale()) {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: APP_FALLBACK_LOCALE,
    messages: {}
  })
}

export const i18n = createAppI18n()
