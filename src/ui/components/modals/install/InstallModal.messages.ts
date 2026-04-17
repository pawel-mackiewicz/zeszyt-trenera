// What: keep InstallModal copy in a typed shared module consumed by UI, tests, and stories. Why: one source of truth removes duplicated literals and keeps locale contracts stable during copy updates.
export const INSTALL_MODAL_MESSAGES = {
  pl: {
    actions: {
      later: 'Później',
      understand: 'Rozumiem'
    },
    install: {
      manual: {
        eyebrow: 'Instalacja ręczna',
        iosSafari: {
          title: 'Dodaj do ekranu głównego',
          body: 'Zainstaluj zeszyt-trenera dla najlepszych wrażeń. Na tej przeglądarce zrobisz to ręcznie, a poniżej masz krótkie kroki.',
          steps: [
            'Stuknij przycisk Udostępnij w Safari.',
            'Wybierz Do ekranu głównego i potwierdź dodanie aplikacji.'
          ]
        }
      },
      native: {
        eyebrow: 'Instalacja PWA',
        title: 'Zainstaluj Zeszyt Trenera',
        body: 'Zainstaluj zeszyt-trenera dla najlepszych wrażeń. Dzięki temu otworzysz go jak lokalną aplikację i wygodniej wrócisz do niego offline.',
        primary: 'Zainstaluj Zeszyt Trenera',
        pending: 'Instalowanie...'
      }
    }
  },
  en: {
    actions: {
      later: 'Later',
      understand: 'Understood'
    },
    install: {
      manual: {
        eyebrow: 'Manual install',
        iosSafari: {
          title: 'Add to Home Screen',
          body: 'Install Coach Notebook for the best experience. This browser needs the manual flow, and the short steps are below.',
          steps: [
            'Tap the Share button in Safari.',
            'Choose Add to Home Screen and confirm the app.'
          ]
        }
      },
      native: {
        eyebrow: 'PWA install',
        title: 'Install Coach Notebook',
        body: 'Install Coach Notebook for the best experience. It will open like a local app and will be easier to return to offline.',
        primary: 'Install Coach Notebook',
        pending: 'Installing...'
      }
    }
  }
} as const

export type InstallModalLocale = keyof typeof INSTALL_MODAL_MESSAGES
