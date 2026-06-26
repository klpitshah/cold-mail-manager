import { readContacts, writeContacts } from './store.js'
import type { Contact } from '../src/types.js'
import { appendSendHistory, normalizeSendHistory } from '../src/utils/sendHistory.js'

export function recordContactSend(
  contactId: string,
  result: { messageId: string; threadId: string; subject: string },
  isFollowUp: boolean,
): Contact | null {
  const contacts = readContacts<Contact>()
  const idx = contacts.findIndex((c) => c.id === contactId)
  if (idx === -1) return null

  const c = contacts[idx]
  const now = new Date().toISOString()
  const history = normalizeSendHistory(c)
  contacts[idx] = {
    ...c,
    status: 'sent',
    lastSentAt: now,
    sendHistory: appendSendHistory(history, now, isFollowUp),
    followUpCount: isFollowUp ? c.followUpCount + 1 : c.followUpCount,
    gmailThreadId: result.threadId,
    gmailMessageId: result.messageId,
    lastSubject: result.subject,
  }
  writeContacts(contacts)
  return contacts[idx]
}
