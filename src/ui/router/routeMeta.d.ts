import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    showBack?: boolean
    hideBottomNav?: boolean
    backTo?: string
    showInMenu?: boolean
  }
}
