import 'fake-indexeddb/auto'

import { config } from '@vue/test-utils'

function createStorageMock() {
  const storage = new Map<string, string>()

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    }
  } as Storage
}

config.global.stubs = {
  transition: false,
  'router-link': {
    template: '<a><slot /></a>'
  }
}

// The app store persists one-time shell state, so tests need a predictable storage implementation instead of relying on environment-specific happy-dom flags.
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: createStorageMock()
})

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: createStorageMock()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query === '(display-mode: standalone)' ? false : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false
  })
})
