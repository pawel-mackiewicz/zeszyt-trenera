import type { AppLocale } from '@/ui/i18n'
import type { AppRouteName } from '@/ui/router'

type ShellTitleTranslator = (key: string) => string

// What: centralize shell chrome route and locale metadata in one module. Why: the header, browser title, and drawer navigation should share one offline-safe dictionary contract instead of drifting through parallel maps.
export const SHELL_LOCALE_OPTIONS = [
  { value: 'pl', label: 'PL' },
  { value: 'en', label: 'EN' }
] as const satisfies ReadonlyArray<{ value: AppLocale; label: string }>

export const SHELL_ROUTE_TITLE_KEYS = {
  'members-list': 'routes.membersList',
  'membership-payments': 'routes.membershipPayments',
  'add-member': 'routes.addMember',
  'attendance-history': 'routes.attendanceHistory',
  'attendance-record': 'routes.attendanceRecord',
  'attendance-edit': 'routes.attendanceEdit',
  'setup-club': 'routes.setupClub',
  'setup-trainer': 'routes.setupTrainer',
  'debug-indexeddb': 'routes.debugIndexedDb'
} as const satisfies Record<AppRouteName, string>

export const SHELL_NAVIGATION_LABEL_KEYS: Partial<
  Record<AppRouteName, string>
> = {
  'debug-indexeddb': 'menu.debugIndexedDb'
}

export function resolveShellRouteTitle({
  routeName,
  fallbackTitle,
  translate
}: {
  routeName: AppRouteName | null
  fallbackTitle: string
  translate: ShellTitleTranslator
}) {
  // What: resolve visible and document shell titles through one pure helper. Why: merging the header should not leave AppShell coupled to a header composable just to keep route labels aligned.
  return routeName
    ? translate(SHELL_ROUTE_TITLE_KEYS[routeName])
    : fallbackTitle
}
