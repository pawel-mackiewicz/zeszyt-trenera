export type SmsDraft = {
  message: string
  phoneNumber: string
}

export interface SmsComposerPort {
  openDraft(draft: SmsDraft): Promise<void>
}
