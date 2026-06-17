// What: keep the shell dictionary in a shared typed module. Why: AppShell and Header need one offline-safe message source instead of duplicated SFC-local JSON blocks that drift independently.
export const APP_SHELL_MESSAGES = {
  pl: {
    app: {
      name: 'Zeszyt Trenera'
    },
    common: {
      cancel: 'Anuluj',
      hide: 'Ukryj',
      understand: 'Rozumiem'
    },
    header: {
      back: 'Wróć',
      menu: 'Menu'
    },
    network: {
      offline: 'Offline'
    },
    menu: {
      debugIndexedDb: 'Debug IndexedDB',
      languageLabel: 'Język',
      exportBackup: {
        action: 'Eksportuj kopię danych',
        pending: 'Eksportowanie kopii...',
        error: 'Nie udało się wyeksportować kopii danych. Spróbuj ponownie.',
        errorDetails: 'Szczegóły techniczne: {details}'
      },
      importBackup: {
        action: 'Przywróć z kopii danych',
        pending: 'Przywracanie kopii...',
        error:
          'Nie udało się przywrócić kopii danych. Sprawdź plik i spróbuj ponownie.'
      },
      resetData: {
        action: 'Reset aplikacji'
      }
    },
    routes: {
      membersList: 'Członkowie',
      membershipPayments: 'Płatności',
      addMember: 'Dodaj członka',
      attendanceHistory: 'Historia treningów',
      attendanceRecord: 'Nowy trening',
      attendanceEdit: 'Edycja treningu',
      campsList: 'Obozy',
      addCamp: 'Nowy obóz',
      setupClub: 'Konfiguracja klubu',
      setupTrainer: 'Konfiguracja trenera',
      debugIndexedDb: 'Podgląd IndexedDB'
    },
    bottomNav: {
      members: 'Członkowie',
      payments: 'Płatności',
      attendance: 'Obecności',
      camps: 'Obozy'
    },
    install: {
      entry: {
        manual: 'Jak zainstalować',
        native: 'Zainstaluj aplikację'
      }
    },
    update: {
      action: {
        ready: 'Aktualizuj aplikację',
        pending: 'Odświeżanie...'
      },
      bannerTitle: 'Tryb offline wymaga uwagi',
      error: {
        registration: 'Nie udało się przygotować trybu offline.',
        activation:
          'Nie udało się włączyć najnowszej wersji aplikacji. Zamknij ją i otwórz ponownie.'
      }
    },
    shellState: {
      retry: 'Spróbuj ponownie',
      checking: {
        eyebrow: 'Uruchamianie',
        title: 'Przygotowuję lokalny zeszyt',
        body: 'Przygotowuję Twoje dane, żeby zeszyt mógł otworzyć się bezpiecznie i działać offline.'
      },
      setupChecking: {
        eyebrow: 'Konfiguracja startowa',
        title: 'Sprawdzam dane startowe',
        body: 'Sprawdzam, czy ten zeszyt ma już przypisany klub i trenera.'
      },
      blocked: {
        eyebrow: 'Stan aplikacji',
        title: 'Nie udało się uruchomić Zeszytu Trenera',
        database: 'Nie udało się otworzyć zeszytu na tym urządzeniu.',
        unknown: 'Aplikacja nie może się teraz uruchomić. Spróbuj ponownie.'
      }
    }
  },
  en: {
    app: {
      name: 'Coach Notebook'
    },
    common: {
      cancel: 'Cancel',
      hide: 'Hide',
      understand: 'Understood'
    },
    header: {
      back: 'Go back',
      menu: 'Open menu'
    },
    network: {
      offline: 'Offline'
    },
    menu: {
      debugIndexedDb: 'Debug IndexedDB',
      languageLabel: 'Language',
      exportBackup: {
        action: 'Export backup',
        pending: 'Exporting backup...',
        error: 'Backup export failed. Try again.',
        errorDetails: 'Technical details: {details}'
      },
      importBackup: {
        action: 'Restore from backup',
        pending: 'Restoring backup...',
        error: 'Backup restore failed. Check the file and try again.'
      },
      resetData: {
        action: 'Reset app data'
      }
    },
    routes: {
      membersList: 'Members',
      membershipPayments: 'Payments',
      addMember: 'Add member',
      attendanceHistory: 'Training history',
      attendanceRecord: 'New training',
      attendanceEdit: 'Edit training',
      campsList: 'Camps',
      addCamp: 'New camp',
      setupClub: 'Club setup',
      setupTrainer: 'Trainer setup',
      debugIndexedDb: 'IndexedDB Inspector'
    },
    bottomNav: {
      members: 'Members',
      payments: 'Payments',
      attendance: 'Attendance',
      camps: 'Camps'
    },
    install: {
      entry: {
        manual: 'How to install',
        native: 'Install app'
      }
    },
    update: {
      action: {
        ready: 'Update app',
        pending: 'Refreshing...'
      },
      bannerTitle: 'Offline mode needs attention',
      error: {
        registration: 'Offline mode could not be prepared.',
        activation:
          'The latest app version could not be applied. Close and reopen the app.'
      }
    },
    shellState: {
      retry: 'Try again',
      checking: {
        eyebrow: 'Starting',
        title: 'Preparing the local notebook',
        body: 'Preparing your data so the notebook can open safely and stay available offline.'
      },
      setupChecking: {
        eyebrow: 'Startup setup',
        title: 'Checking required setup data',
        body: 'Checking whether this notebook already has a club and trainer assigned.'
      },
      blocked: {
        eyebrow: 'App state',
        title: 'Coach Notebook could not start',
        database: 'The notebook could not be opened on this device.',
        unknown: 'The app cannot start right now. Try again.'
      }
    }
  }
} as const

export type AppShellLocale = keyof typeof APP_SHELL_MESSAGES
