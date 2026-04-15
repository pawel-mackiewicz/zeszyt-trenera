import { v7 as uuidv7 } from 'uuid'

import type { IdGeneratorPort } from '@/write/application/ports/IdGeneratorPort'

export class IdGenerator implements IdGeneratorPort {
  // Keeping concrete ID generation in infrastructure preserves the application/domain boundary while still using the existing identifier format.
  public generate(): string {
    return uuidv7()
  }
}
