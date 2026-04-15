# Dependency Injection and Adding Use Cases

This project uses a small manual DI setup.

The rule is simple:

- application code defines workflow contracts and use cases
- infra code assembles concrete implementations
- UI code consumes workflows from the shared service bag

Do not instantiate repositories, `DexieUnitOfWork`, or use cases inside Vue views.
Do not add a new injection key for every use case.
All app workflows should be exposed through `appServices.useCases`.

## Current DI entry points

- `src/write/application/UseCase.ts`
- `src/appServices.ts`
- `src/ui/appServices.ts`
- `src/ui/main.ts`

## End-to-end flow for a new use case

### 1. Add the request DTO

Create the command or request type under `src/write/application/requests`.

Example:

```ts
export type CreateTrainerCommand = {
  firstName: string
  lastName: string
}
```

Why: request DTOs make the workflow contract explicit and keep the UI from passing loose objects around.

### 2. Add or reuse application ports

If the use case needs persistence or transactional behavior, add ports under `src/write/application/ports`.

Example:

```ts
export interface TrainerRepoPort {
  save(trainer: Trainer): Promise<void>
}
```

Why: the application layer should depend on behavior, not Dexie classes.

### 3. Implement the use case

Create the use case in `src/write/application` and implement the generic `UseCase<TRequest, TResult>` contract.

Example:

```ts
import type { UseCase } from '@/write/application/UseCase'
import type { CreateTrainerCommand } from '@/write/application/requests/CreateTrainerCommand'

export class CreateTrainerUseCase implements UseCase<CreateTrainerCommand> {
  constructor(private readonly trainerRepo: TrainerRepoPort) {}

  async handle(command: CreateTrainerCommand): Promise<void> {
    // domain logic
  }
}
```

Why: every workflow follows the same shape, so adding more use cases does not create custom wiring patterns.

### 4. Add infra adapters if needed

If the use case needs new persistence behavior, implement the matching Dexie adapters in `src/write/infra/db`.

Examples:

- `DexieTrainerRepo`
- `DexieSomethingElseRepo`

Why: infra owns concrete storage details. The use case should still depend only on application ports.

### 5. Register the use case in `appServices`

Open `src/appServices.ts` and wire the new use case into the shared service bag.

Typical changes:

1. import the new request type and use case
2. extend `AppUseCases`
3. add lazy resolvers for new infra dependencies
4. expose the use case through the `useCases` object

Example shape:

```ts
export type AppUseCases = {
  readonly registerClub: UseCase<RegisterClubCommand>
  readonly createTrainer: UseCase<CreateTrainerCommand>
}

const resolveTrainerRepo = lazy(() => new DexieTrainerRepo(database))
const resolveCreateTrainer = lazy(
  () => new CreateTrainerUseCase(resolveTrainerRepo())
)

const useCases: AppUseCases = {
  get registerClub() {
    return resolveRegisterClub()
  },
  get createTrainer() {
    return resolveCreateTrainer()
  }
}
```

Why: `appServices` is the single composition root. New workflows should be added there instead of introducing new container files or new public resolver APIs.

### 6. Do not change bootstrap for each new use case

`src/ui/main.ts` already provides the whole service bag:

```ts
provideAppServices(app, appServices)
```

Normally that line does not need to change when a new use case is added.

Why: bootstrap should stay stable while the service bag grows.

### 7. Consume the use case in the UI

Read the workflow directly from `useAppServices().useCases`.

Then use it in the Vue view:

```vue
<script setup lang="ts">
import { useAppServices } from '@/ui/appServices'

const createTrainerUseCase = useAppServices().useCases.createTrainer

async function handleSubmit() {
  await createTrainerUseCase.handle({
    firstName: 'Jan',
    lastName: 'Kowalski'
  })
}
</script>
```

Why: views should depend on the shared UI seam, not on infra assembly details.

### 8. Test through the same UI seam

When testing a component, stub the shared `UiAppServices` object instead of mocking infra modules.

Example:

```ts
const appServices: UiAppServices = {
  useCases: {
    registerClub: {
      handle: vi.fn()
    },
    createTrainer: {
      handle: vi.fn()
    }
  }
}

mount(ComponentUnderTest, {
  global: {
    provide: createAppServicesProvides(appServices)
  }
})
```

Why: UI tests should verify component behavior, not infra construction.

## Rules to keep the DI system maintainable

- Add new workflows to `appServices.useCases`, not to a new container layer.
- Keep repositories and `UnitOfWork` private to infra.
- Keep Vue components unaware of Dexie classes.
- Read workflows directly from `useAppServices().useCases` instead of adding wrapper helpers for each one.
- Use the generic `UseCase<TRequest, TResult>` contract unless a workflow needs a genuinely different shape.

## Checklist for adding a new use case

1. Add request DTO in `src/write/application/requests`.
2. Add or reuse application ports in `src/write/application/ports`.
3. Implement the use case in `src/write/application` with `UseCase<TRequest, TResult>`.
4. Add infra adapters in `src/write/infra/db` if needed.
5. Register the workflow in `src/appServices.ts`.
6. Use `useAppServices().useCases.someWorkflow` in the view.
7. Stub `UiAppServices` in component tests.

## Anti-patterns

- Importing `Dexie...` classes into Vue views
- Instantiating `new SomeUseCase(...)` inside a component
- Adding a separate Vue injection key for each workflow
- Adding wrapper helpers in `src/ui/appServices.ts` for every workflow
- Exposing repositories directly to the UI
- Creating a new container file every time a use case is added

If the app grows, complexity should accumulate inside `appServices`, not in the number of public DI concepts.
