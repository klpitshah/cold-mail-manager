import type { Contact } from '../types.js'

/** Rebuild sendHistory for contacts saved before per-send dates were tracked. */
export function normalizeSendHistory(contact: Contact): string[] {
  if (contact.sendHistory?.length) return contact.sendHistory
  if (!contact.lastSentAt) return []

  if (contact.followUpCount === 0) return [contact.lastSentAt]

  const history = [contact.createdAt]
  for (let i = 1; i <= contact.followUpCount; i++) {
    history.push(contact.lastSentAt)
  }
  return history
}

export function appendSendHistory(history: string[], date: string, isFollowUp: boolean): string[] {
  if (!isFollowUp) return [date]
  return [...history, date]
}
