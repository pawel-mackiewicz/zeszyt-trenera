export const APP_LOCALE_STORAGE_KEY = 'zeszyt-trenera.locale'
export const INSTALL_MODAL_SHOWN_STORAGE_KEY =
  'zeszyt-trenera.install-modal-shown-once'
export const DEMO_LIFECYCLE_STORAGE_KEY = 'zeszyt-trenera.demo-lifecycle'
export const ATTENDANCE_DRAFT_STORAGE_KEY = 'zeszyt-trenera.attendance-draft'

export const APP_OWNED_LOCAL_STORAGE_KEYS = [
  APP_LOCALE_STORAGE_KEY,
  INSTALL_MODAL_SHOWN_STORAGE_KEY,
  DEMO_LIFECYCLE_STORAGE_KEY,
  ATTENDANCE_DRAFT_STORAGE_KEY
] as const
