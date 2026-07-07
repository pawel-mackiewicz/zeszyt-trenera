// What: keep Vue Router runtime imports behind one local boundary.
// Why: specs can mock `@/ui/router/runtime` instead of the external package, and router dependency migrations stay scoped to this adapter.
export {
  RouterLink,
  RouterView,
  createMemoryHistory,
  createRouter,
  createWebHistory,
  useRoute,
  useRouter
} from 'vue-router'

export type {
  RouteLocationNormalized,
  RouteLocationNormalizedLoaded,
  RouteRecordRaw,
  Router,
  RouterOptions
} from 'vue-router'
