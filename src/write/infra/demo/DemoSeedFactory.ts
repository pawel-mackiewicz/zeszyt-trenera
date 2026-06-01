import type { DemoSeedFactoryPort } from '@/write/application/ports/DemoSeedFactoryPort.ts'

import { createDemoSeed } from '@/write/infra/demo/createDemoSeed.ts'

export class DemoSeedFactory implements DemoSeedFactoryPort {
  // Why: the composition root injects this adapter so application bootstrap logic stays independent from infra module placement.
  public createSeed(now: Date) {
    return createDemoSeed(now)
  }
}
