// What: keep DemoIntroModal copy in a typed shared module consumed by UI and tests. Why: one translation source removes fragile duplicated string assertions and keeps locale contracts aligned.
export const DEMO_INTRO_MODAL_MESSAGES = {
  pl: {
    demo: {
      eyebrow: 'Tryb demo',
      title: 'Sprawdź apkę',
      copy: 'Sprawdź zeszyt-trenera na testowych danych :)',
      actions: {
        confirm: 'Już testowałem :)',
        pending: 'Przechodzę do konfiguracji...',
        stay: 'Sprawdzam!'
      }
    }
  },
  en: {
    demo: {
      eyebrow: 'Demo mode',
      title: 'Check out the app',
      copy: 'Check out Coach Notebook on sample data :)',
      actions: {
        confirm: "I've tested it :)",
        pending: 'Opening setup...',
        stay: 'Checking it out!'
      }
    }
  }
} as const

export type DemoIntroModalLocale = keyof typeof DEMO_INTRO_MODAL_MESSAGES
