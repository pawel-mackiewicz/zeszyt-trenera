# Zeszyt Trenera

Vue 3 boilerplate for a mobile-first, offline-ready PWA. The starter is intentionally domain-neutral: it sets up the app shell, install/update flow, and Dexie entrypoint without locking in any real entity model yet.

## Stack

- Vite SPA
- Vue 3 + TypeScript
- Vue Router
- Pinia
- Dexie
- `vite-plugin-pwa`
- Vitest

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm preview`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm lint:fix`
- `pnpm format`
- `pnpm test`

## What ships in the boilerplate

- Mobile-first app shell with bottom navigation
- Custom install button backed by the browser install prompt
- Service worker update signal and refresh action
- Online/offline runtime signal
- Minimal Dexie database bootstrap with schema versioning reserved from day one

## Architecture notes

- Dependency injection and adding new workflows: `docs/dependency-injection.md`

## Adding the first Dexie table

1. Open `src/db/index.ts`.
2. Replace the empty `stores({})` call with your first table definitions.
3. Keep schema changes additive by introducing a new `version()` block for each migration.

## Notes

- The PWA manifest currently uses SVG icons. If you later need platform-specific PNG assets, add them under `public/icons` and update the manifest entries in `vite.config.ts`.
- The starter keeps Pinia focused on runtime/UI state. Domain data should stay in Dexie until a real feature proves a better boundary.
