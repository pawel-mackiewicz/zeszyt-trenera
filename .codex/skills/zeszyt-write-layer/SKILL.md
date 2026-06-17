---
name: zeszyt-write-layer
description: Work on write-layer behavior in the zeszyt-trenera repository. Use when Codex needs to add, change, review, or test commands, application requests, use cases, write-side app services, service-bag mocks, or domain behavior reached through write operations in src/write or adjacent application-layer code.
---

# Zeszyt Write Layer

## Overview

Use this skill for write-side application work in this repository: commands, use cases, application request types, service exposure, mocks, and tests around state-changing behavior.

The app is PWA, local-first, and mobile-first. Preserve that model: writes must go through the application layer, and domain rules must stay in domain code.

## Workflow

1. Inspect the nearest existing write-side command, use case, application request, service, and test that match the requested behavior. Keep discovery narrow and ask when broader context is needed.
2. Follow DDD and hexagonal architecture boundaries. Put business decisions in the domain; keep application use cases focused on orchestration, persistence, and ports.
3. When creating a use case, add the command or request type under the feature's `application/requests` area.
4. Expose new use cases through `src/appServices.ts`.
5. Update service-bag tests or mocks that implement `AppUseCases` when the use-case surface changes.
6. Check similar use cases before inventing structure, naming, return types, or test helpers.
7. Write tests as a story. Use helpers when they make the scenario read like user or domain behavior instead of setup plumbing.
8. Run the narrowest useful validation commands for the touched behavior.
9. Follow repo-level version handling after completing the task: bump `package.json` only when required by the current branch rules.

## Testing Rules

- When using the `Money` value object in tests, separate cents with an underscore: write `200_00`, not `20_000`.
- Prefer test names and helper names that describe the business scenario.
- Keep assertions focused on observable application behavior and domain outcomes.

## Boundary Checks

Before editing, identify which layer owns the behavior:

- Domain invariant or calculation: implement it in domain.
- Command orchestration or persistence transaction: implement it in the application use case.
- Port or storage concern: implement it behind the existing adapter boundary.
- UI trigger for a write: call the app service or use case; do not duplicate write logic in Vue.

If the ownership is unclear, ask before editing.
