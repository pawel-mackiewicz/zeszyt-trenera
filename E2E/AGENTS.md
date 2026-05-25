# Playwright Rules for Local-First PWA

1. **Local-First Context:** NO backend, NO network requests. NEVER use `page.waitForResponse()`. Wait only for DOM updates.
2. **State Isolation:** Every test starts with empty IndexedDB/Storage. Seed data via UI actions.
3. **Persistence (CRITICAL):** ALWAYS `await page.reload()` after state mutations and _before_ final assertions to verify local save.
4. **Locators:** Strictly use `getByRole`, `getByLabel`, or `getByText`. NO CSS selectors or XPath.
5. **Subagent Workflow:** If user-centric locators aren't possible, DO NOT guess. Ask the user for permission to run a subagent to inject a semantic `data-testid` into the app's source code.
6. **Offline Mode:** Use `await context.setOffline(true)` to test offline capabilities.
