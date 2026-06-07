export interface DatabaseBackupExportPort {
  exportBackupBlob(): Promise<Blob>
}
