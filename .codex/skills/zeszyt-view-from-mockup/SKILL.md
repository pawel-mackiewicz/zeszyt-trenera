---
name: zeszyt-view-from-mockup
description: Build Vue views for the zeszyt-trenera repository from provided HTML/static mockups, screenshots, or mockup files. Use when Codex is asked to implement, adapt, or refine a repo UI view from a mockup, especially under .temp/views.
---

# Zeszyt View From Mockup

Use this skill to turn a mockup into a production Vue view in this repository without drifting from the app architecture or visual language.

## Workflow

1. Read the mockup artifact and identify the feature domain, route intent, fields, actions, empty/loading/error states, and navigation behavior.
2. Locate the closest existing view, component, composable, spec, route, query, or use case before creating new structure. Keep the total repo files inspected under 10 unless the user approves more.
3. Load [references/view-from-mockup.md](references/view-from-mockup.md) before editing files.
4. Translate the mockup into existing repo patterns instead of copying prototype-only implementation details such as CDN assets, Tailwind utility markup, decorative backgrounds, or one-off colors.
5. Put feature behavior in domain composables and application services/use cases. Keep UI-only state inside components.
6. Add focused story-like tests around the user workflow and accessible states.
7. Validate with the narrowest useful commands, then bump `package.json` patch version once when the plan is complete.

## Repo Defaults

- Treat the app as PWA, local-first, and mobile-first.
- Use Vue SFCs with `script setup lang="ts"` and existing `@/` aliases.
- Use app tokens such as `--color-*` and `--font-*`; do not introduce gradients, shadows, large hero type, or nested cards unless a nearby existing view already establishes that exact pattern.
- Prefer existing app components such as `AppButton`, `FloatingErrorAlert`, modal components, row/section components, and lucide icons.
- Add `aria-label`, `aria-labelledby`, `aria-live`, and hidden decorative icons as appropriate.
- Route reads through `queries` and writes through `useCases` from `useAppServices()`.

## Calibration Example

For `.temp/views/camp_add_outsider.html`, start by comparing against the camps registration flow, especially `RegisterClubCampParticipantView.vue` and `useRegisterClubCampParticipant.ts`. Reuse its price, discount, payment, overpayment, amount-yet-to-pay, submit, and route-return patterns, then add the outsider identity fields through the appropriate application-layer command shape.
