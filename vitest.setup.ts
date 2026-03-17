import 'fake-indexeddb/auto'

import { config } from '@vue/test-utils'

config.global.stubs = {
  transition: false,
  'router-link': {
    template: '<a><slot /></a>'
  }
}

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
