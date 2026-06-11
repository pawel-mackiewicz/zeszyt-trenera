import type { AppLocale } from '@/ui/i18n'
import type { AppRouteName } from '@/ui/router'

type ShellTitleTranslator = (key: string) => string
type ShellBottomNavigationIconName =
  | 'calendar_today'
  | 'group'
  | 'payments'
  | 'terrain'

export type ShellBottomNavigationItem = {
  id: 'attendance' | 'camps' | 'members' | 'payments'
  to: string
  icon: ShellBottomNavigationIconName
  labelKey: string
  activeRouteNames: ReadonlyArray<AppRouteName>
}

// What: centralize shell chrome route and locale metadata in one module. Why: the header, browser title, and sidebar navigation should share one offline-safe dictionary contract instead of drifting through parallel maps.
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
  'camps-list': 'routes.campsList',
  'camp-details': 'routes.campsList',
  'add-camp-participant': 'routes.campsList',
  'add-camp': 'routes.addCamp',
  'setup-club': 'routes.setupClub',
  'setup-trainer': 'routes.setupTrainer',
  'debug-indexeddb': 'routes.debugIndexedDb'
} as const satisfies Record<AppRouteName, string>

export const SHELL_NAVIGATION_LABEL_KEYS: Partial<
  Record<AppRouteName, string>
> = {
  'debug-indexeddb': 'menu.debugIndexedDb'
}

// What: keep persistent mobile shell destinations in one typed config. Why: Header and BottomNavigation should both stay smart while AppShell keeps only layout and orchestration responsibility.
export const SHELL_BOTTOM_NAVIGATION_ITEMS: ReadonlyArray<ShellBottomNavigationItem> =
  [
    {
      id: 'members',
      to: '/members',
      icon: 'group',
      labelKey: 'bottomNav.members',
      activeRouteNames: ['members-list']
    },
    {
      id: 'payments',
      to: '/payments',
      icon: 'payments',
      labelKey: 'bottomNav.payments',
      activeRouteNames: ['membership-payments']
    },
    {
      id: 'attendance',
      to: '/attendance',
      icon: 'calendar_today',
      labelKey: 'bottomNav.attendance',
      activeRouteNames: [
        'attendance-history',
        'attendance-record',
        'attendance-edit'
      ]
    },
    {
      id: 'camps',
      to: '/camps',
      icon: 'terrain',
      labelKey: 'bottomNav.camps',
      activeRouteNames: [
        'camps-list',
        'camp-details',
        'add-camp-participant',
        'add-camp'
      ]
    }
  ]

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
