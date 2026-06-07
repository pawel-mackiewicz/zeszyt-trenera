import type { DemoSeedFactoryPort } from '@/system_management/demo/application/ports/DemoSeedFactoryPort.ts'

import { createDemoSeed } from '@/system_management/demo/infra/seed/createDemoSeed.ts'

export class DemoSeedFactory implements DemoSeedFactoryPort {
  // Why: the composition root injects this adapter so application bootstrap logic stays independent from infra module placement.
  public createSeed(now: Date) {
    return createDemoSeed(now)
  }
}
