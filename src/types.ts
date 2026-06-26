export type ContactStatus = 'staged' | 'sent' | 'replied' | 'no_response'

export interface AppSettings {
  yourName: string
  defaultInitialTemplate: string
  defaultFollowUpTemplate: string
}

export interface Contact {
  id: string
  name: string
  company: string
  email: string
  role: string
  linkedinLink: string
  jobLink: string
  mailDraft: string
  initialTemplateId: string
  status: ContactStatus
  lastSentAt: string | null
  sendHistory: string[]
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

export type ScheduledSendType = 'initial' | 'follow-up'

export interface ScheduledSend {
  id: string
  contactId: string
  type: ScheduledSendType
  sendAt: string
  draft: string
  status: 'pending' | 'failed'
  error?: string
  createdAt: string
}
