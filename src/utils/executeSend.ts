import type { Contact, ScheduledSendType } from '../types'
import { sendEmail, sendReply } from '../services/gmail'
import type { SendEmailResult } from '../types'

export async function executeContactSend(
  token: string,
  contact: Contact,
  draft: string,
  type: ScheduledSendType,
): Promise<SendEmailResult> {
  if (
    type === 'follow-up' &&
    contact.gmailThreadId &&
    contact.gmailMessageId &&
    contact.lastSubject
  ) {
    return sendReply(
      token,
      contact.email,
      draft,
      contact.gmailThreadId,
      contact.gmailMessageId,
      contact.lastSubject,
    )
  }

  return sendEmail(token, contact.email, draft, {
    threadId: contact.gmailThreadId ?? undefined,
  })
}
