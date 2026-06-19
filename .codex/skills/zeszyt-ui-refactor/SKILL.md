---
name: zeszyt-ui-refactor
description: Refactor shared Vue UI patterns in the zeszyt-trenera repository. Use when Codex needs to clean up duplicated component markup, props, events, slots, styles, typography, CSS tokens, or shared UI APIs under src/ui; when repeated UI should be moved into a component for related components; or when unrelated components should share presentation through src/ui/style.css.
---

# Zeszyt UI Refactor

## Overview

Use this skill for UI-only refactoring in this repository. Preserve the app model: PWA, local-first, mobile-first, and all state-changing behavior must still go through the application layer.

## Workflow

1. Inspect only the touched component, its closest related components, existing shared primitives, and `src/ui/style.css`. Keep the search narrow; ask before broad scans.
2. Classify the duplication before extracting:
   - Related components sharing responsibility, behavior, markup structure, or a common props/events/slots contract: extract or extend a shared Vue component.
   - Unrelated components sharing only presentation details: extract shared style, tokens, or utility classes into `src/ui/style.css`.
3. Once a concrete pattern is identified, run a targeted repo scan for the same pattern and include matching cases in the same refactor. For example, when extracting three modals into one shared component, search other modal components for the same shell, props, actions, pending state, error handling, or detail layout before stopping.
4. Apply the three-use threshold before creating a new shared abstraction. Prefer local cleanup for one or two uses unless the current task explicitly asks for the extraction.
5. Reuse or extend existing primitives such as `AppButton`, `BaseModal`, `ConfirmationModal`, `FloatingErrorAlert`, and existing filter or row components before introducing another shared component.
6. Keep feature/domain behavior in domain composables that call app services or use cases. Keep UI-only state inside components.
7. Add or update story-like tests around observable behavior, accessible states, and any shared component API that changed.
8. Run the narrowest useful validation commands and follow repo version handling rules.

## Component Extraction

- Extract a component when the duplicated UI is related by domain, workflow, or responsibility, not just by appearance.
- After deciding to extract, search `src/ui` for sibling components, names, imports, props, emits, slots, class names, and markup shapes that match the extracted pattern. Refactor all clear matches, and ask before pulling in ambiguous or larger-scope cases.
- Give the extracted component a small explicit API using typed props, typed emits, and slots only where callers need real variation.
- Keep caller-specific data loading, commands, route navigation, and feature decisions outside the shared component.
- Prefer colocating feature-specific shared components inside the feature/view area. Use `src/ui/components` only for cross-feature primitives.
- Preserve accessibility behavior in the abstraction, including labels, disabled states, focus handling, `aria-*`, and decorative icon hiding.
- Do not create a component just to share font family, colors, shadows, borders, or spacing between unrelated screens.

## Shared Style Extraction

- Put app-wide or cross-feature presentation in `src/ui/style.css` when unrelated components need the same visual rule.
- Good candidates include typography recipes, font variables, label utilities, visually-hidden helpers, safe-area utilities, shell-critical positioning, and low-level reusable effects.
- Keep component layout, feature spacing, view-specific grids, and one-off state styling inside scoped component styles.
- Prefer existing tokens such as `--color-*`, `--font-*`, `--space-*`, and established utilities such as `.app-section-label`.
- Name shared classes with the `app-` prefix when they represent app-wide UI language.
- Avoid moving styles into `src/ui/style.css` only to make a single component smaller.

## Repo Rules

- Use Vue SFCs with `script setup lang="ts"` and existing `@/` aliases.
- Preserve compact, utilitarian, mobile-first UI. Avoid decorative gradients, oversized hero typography, nested cards, and one-off colors.
- Prefer lucide or existing app icons over custom SVG for controls.
- Keep CSS readable and scoped by default; use global CSS only for deliberate shared language.
- Write tests like a user story. Create helpers when they make the scenario read as behavior rather than setup plumbing.
