import { describe, expect, it } from 'vitest'

import {
  APP_LOCALE_STORAGE_KEY,
  detectBrowserLocale,
  normalizeAppLocale,
  persistLocale,
  readStoredLocale,
  resolveInitialLocale
} from '@/ui/i18n'

describe('i18n bootstrap', () => {
  it('normalizes supported locale codes and ignores unsupported ones', () => {
    expect(normalizeAppLocale('pl-PL')).toBe('pl')
    expect(normalizeAppLocale('en-US')).toBe('en')
    expect(normalizeAppLocale('de-DE')).toBeNull()
  })

  it('prefers a stored locale over browser detection', () => {
    const storage = {
      getItem: (key: string) => (key === APP_LOCALE_STORAGE_KEY ? 'en' : null),
      setItem: () => undefined
    }

    expect(
      resolveInitialLocale({
        storage,
        browserNavigator: { language: 'pl-PL' }
      })
    ).toBe('en')
  })

  it('falls back to the browser locale when storage is empty or invalid', () => {
    const emptyStorage = {
      getItem: () => null,
      setItem: () => undefined
    }
    const invalidStorage = {
      getItem: () => 'de',
      setItem: () => undefined
    }

    expect(
      resolveInitialLocale({
        storage: emptyStorage,
        browserNavigator: { language: 'en-GB' }
      })
    ).toBe('en')
    expect(readStoredLocale(invalidStorage)).toBeNull()
    expect(detectBrowserLocale({ language: 'pl' })).toBe('pl')
  })

  it('persists the chosen locale without requiring the application database', () => {
    const writes: Record<string, string> = {}
    const storage = {
      getItem: (key: string) => writes[key] ?? null,
      setItem: (key: string, value: string) => {
        writes[key] = value
      }
    }

    persistLocale('pl', storage)

    expect(writes[APP_LOCALE_STORAGE_KEY]).toBe('pl')
  })
})
