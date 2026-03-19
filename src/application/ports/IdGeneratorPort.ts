// The application asks for new IDs through a port so domain workflows stay isolated from infrastructure-specific generators.
export interface IdGeneratorPort {
  generate(): string
}
