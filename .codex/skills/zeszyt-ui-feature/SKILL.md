---
name: zeszyt-ui-feature
description: Build or edit UI-related Vue features in the zeszyt-trenera repository when no mockup is provided. Use when Codex needs to add, change, or refine app UI, views, components, domain composables, accessible states, or interaction flows from a written request. Do not use for mockup-driven work; use zeszyt-view-from-mockup for HTML/static mockups, screenshots, or mockup files.
---

# Zeszyt UI Feature

## Overview

Use this skill for ordinary UI feature work in this repository: new screens, existing view changes, component extraction, accessible UI states, and interaction behavior described by the user rather than supplied as a mockup.

## Workflow

1. Confirm the request is not mockup-driven. If the user provided a mockup artifact, switch to `zeszyt-view-from-mockup`.
2. Inspect only the closest existing view, component, composable, route, query, app service, and test files needed to understand the feature. Keep the search narrow; ask when broader discovery is necessary.
3. Preserve the app model: PWA, local-first, mobile-first. Reads should follow existing query patterns and writes must go through the application layer.
4. Put feature/domain behavior in domain composables that call app services or use cases. Keep UI-only state, layout toggles, and presentation details inside Vue components.
5. Split UI into components when a part has a clear responsibility that can be named and reasoned about.
6. Add story-like tests for the main user workflow, accessible states, and any application-layer behavior touched by the UI.
7. Run the narrowest useful validation commands and follow `AGENTS.md` for version handling, including the feature-branch exception.

## Vue And UI Rules

- Use Vue SFCs with `script setup lang="ts"` and existing repo aliases.
- Follow the current app style: compact, clear, utilitarian, and mobile-first.
- Prefer simple full-width sections with top and bottom borders over card-like panels.
- Use app tokens such as `--color-*` and `--font-*`; avoid one-off colors, gradients, and shadows.
- Keep section labels as small uppercase mono text with wide letter spacing when the nearby UI uses that pattern.
- Avoid decorative gradients, oversized hero typography, nested cards, and non-domain explanatory copy inside feature UI.
- Add appropriate `aria-label`, `aria-labelledby`, `aria-live`, and hidden decorative icon attributes for accessible interactions.
- Prefer separate `<style>` sections over inline CSS.
