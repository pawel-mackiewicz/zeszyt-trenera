---
name: zeszyt-e2e-playwright
description: Write or update Playwright end-to-end tests in the zeszyt-trenera repository. Use when Codex works on E2E specs, local-first PWA behavior, offline scenarios, IndexedDB or storage persistence, semantic Playwright locators, or test flows that mutate app state through the UI.
---

# Zeszyt E2E Playwright

## Overview

Use this skill for Playwright E2E tests in this repository. The app is a local-first PWA, so tests must prove user-visible state, persistence, and offline behavior without relying on backend traffic.

## Rules

- Keep the test context local-first: expect no backend and no network request dependency. Never use `page.waitForResponse()`; wait for DOM updates instead.
- Start every test from isolated state. Clear IndexedDB and storage, and seed data only through UI actions.
- Verify persistence after state mutations. Always call `await page.reload()` before final assertions that depend on saved local state.
- Use user-centric locators only: `getByRole`, `getByLabel`, or `getByText`. Do not use CSS selectors or XPath.
- If user-centric locators cannot target the flow, do not guess. Ask the user for permission to run a subagent that can add a semantic `data-testid` in the app source.
- Use `await context.setOffline(true)` for offline capability tests.

## Workflow

1. Prefer writing tests as user stories: arrange through visible UI actions, act as the user would, then assert on visible outcomes.
2. Use existing demo data when it fits the story and keeps the setup realistic; otherwise create only the data the test needs through the UI.
3. After any action that should persist locally, reload before the final assertion.
4. Keep waits tied to accessible DOM changes, not timers or network events.
5. Run the narrowest relevant Playwright command for the changed spec when possible.
