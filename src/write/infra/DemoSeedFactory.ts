import type { DemoSeedFactoryPort } from '@/write/application/ports/DemoSeedFactoryPort'

import { createDemoSeed } from '@/write/infra/createDemoSeed'

export class DemoSeedFactory implements DemoSeedFactoryPort {
  // Why: the composition root injects this adapter so application bootstrap logic stays independent from infra module placement.
  public createSeed(now: Date) {
    return createDemoSeed(now)
  }
}
