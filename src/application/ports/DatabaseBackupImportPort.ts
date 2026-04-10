export interface DatabaseBackupImportPort {
  importBackupFile(file: File): Promise<void>
}
