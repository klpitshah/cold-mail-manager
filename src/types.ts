export type ContactStatus = 'staged' | 'sent' | 'replied' | 'no_response'

export interface Contact {
  id: string
  name: string
  company: string
  email: string
  role: string
  jobLink: string
  mailDraft: string
  status: ContactStatus
  lastSentAt: string | null
  followUpCount: number
  notes: string
  createdAt: string
  gmailThreadId: string | null
  gmailMessageId: string | null
  lastSubject: string | null
}

export interface CompanyGroup {
  company: string
  contacts: Contact[]
}

export interface SendEmailResult {
  messageId: string
  threadId: string
  subject: string
}
