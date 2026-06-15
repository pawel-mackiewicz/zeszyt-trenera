# View From Mockup Reference

## Initial Scan

- Inspect the mockup first. Extract only durable product requirements: labels, fields, actions, state transitions, validation hints, navigation, and hierarchy.
- Use `rg --files` and targeted reads to find nearby code. Stay under 10 inspected repo files unless the user approves more.
- Prefer domain proximity over visual similarity. A camps mockup should start in `src/ui/views/camps`, payments in `src/ui/views/payments`, roster in `src/ui/views/roster`, and so on.
- If a close flow exists, adapt it. Do not create a parallel implementation with duplicated data parsing, submission, or navigation behavior.

## Implementation Rules

- Create or update views under `src/ui/views/<domain>`.
- Split UI into components when a part can be named and reasoned about independently, such as a row, summary, form section, drawer, or modal.
- Create domain composables for feature behavior. Components call composables; composables call `useAppServices()`.
- Keep UI-only concerns in the component: focus targets, local disclosure state, selected warning target, transient visual flags, and template-only formatting.
- Route all writes through application use cases. If the use case or command does not exist, create it in the matching `src/write/<domain>/application` area and wire it through `src/appServices.ts` and `src/ui/appServices.ts`.
- Use read queries for loaded state. Do not read or write IndexedDB directly from a component or composable.
- Preserve route metadata conventions: transactional screens usually set `showBack: true` and `hideBottomNav: true`, with a stable `backTo`.

## UI Translation

- Convert mockup typography, color, and spacing to repo tokens and nearby view classes. Do not copy Tailwind classes, Google font links, Material Symbols, CDN scripts, inline prototype config, dotted backgrounds, or decorative effects.
- Prefer simple full-width sections with top/bottom borders. Avoid card-like panels unless the nearest existing domain view already uses one for the same workflow.
- Use `AppButton` for commands and lucide icons for labels/buttons when an icon is useful. Mark decorative icons with `aria-hidden="true"`.
- Keep labels as small uppercase mono text using existing `.app-section-label` patterns.
- Make controls mobile-first: full-width inputs/buttons, stable heights, no viewport-scaled fonts, no negative letter spacing, and no text overflow.
- Keep visible copy domain-specific. Do not add explanatory text about how to use the UI unless it is actual product copy.
- Include loading, load-error, submit-error, disabled/submitting, empty, and success navigation states when the workflow can reach them.

## I18n And Copy

- Follow the local pattern of the nearest view: use an `<i18n lang="json">` block or local `messages` object consistently with that area.
- Add Polish and English strings when the surrounding feature does.
- Keep field ids stable and descriptive. Pair every label with a control using `for`/`id`, or use `aria-labelledby` for outputs.

## Testing

- Write tests like a user story: arrange the app state, render/navigate to the view, interact with named controls, and assert visible results or use-case calls.
- Add helpers when setup repeats: service doubles, route factories, render helpers, and form-filling helpers.
- Prefer testing the workflow over implementation details. Verify app-service calls rather than direct persistence.
- Cover the main success path, validation/submit failure, and any loading or load-error state introduced by the view.

## Validation

- Run `pnpm typecheck` after TypeScript or Vue changes.
- Run focused `pnpm test` specs for the touched feature. Run the wider test command when shared application services, router behavior, or domain use cases changed.
- For visual UI work, run the dev server and inspect the screen at mobile width before finishing when feasible.
- Bump `package.json` patch version once after the completed implementation plan.

## Example Mapping

For `.temp/views/camp_add_outsider.html`:

- Treat the mockup as a camp participant registration screen for a person outside the club.
- Reuse the existing club participant registration flow for camp context, price display, discount/payment toggles, overpayment warning, amount yet to pay, submit state, error alert, and navigation back to `/camps/:campId/participants/new`.
- Add outsider fields such as first name and last name as actual form state. Avoid introducing mockup-only modal chrome if the route is a full transactional page.
- Submit through the camp participant registration use case with an outsider/person command shape, creating application-layer support first if it does not exist.
