import type { Contact, AppSettings, ScheduledSend, ScheduledSendType } from '../types'
import type { EmailTemplateOption, TemplateCatalog } from '../utils/templateRender'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface StagingInput {
  name: string
  company: string
  email: string
  role: string
  jobLink: string
  mailDraft: string
  initialTemplateId: Contact['initialTemplateId']
  notes: string
}

export const api = {
  getContacts: () => request<Contact[]>('/contacts'),

  createContact: (data: StagingInput) =>
    request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),

  bulkImport: (contacts: Contact[]) =>
    request<Contact[]>('/contacts/bulk', { method: 'POST', body: JSON.stringify({ contacts }) }),

  updateContact: (id: string, updates: Partial<Contact>) =>
    request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  recordSend: (
    id: string,
    result: { messageId: string; threadId: string; subject: string },
    isFollowUp: boolean,
  ) =>
    request<Contact>(`/contacts/${id}/record-send`, {
      method: 'POST',
      body: JSON.stringify({ result, isFollowUp }),
    }),

  deleteContact: (id: string) => request<void>(`/contacts/${id}`, { method: 'DELETE' }),

  getScheduledSends: () => request<ScheduledSend[]>('/scheduled-sends'),

  createScheduledSend: (data: {
    contactId: string
    type: ScheduledSendType
    sendAt: string
    draft: string
  }) =>
    request<ScheduledSend>('/scheduled-sends', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteScheduledSend: (id: string) =>
    request<void>(`/scheduled-sends/${id}`, { method: 'DELETE' }),

  getSettings: () => request<AppSettings>('/settings'),

  getTemplates: () =>
    request<{
      main: EmailTemplateOption[]
      followUp: EmailTemplateOption[]
      defaults: TemplateCatalog['defaults']
      catalog: TemplateCatalog
    }>('/templates'),

  updateSettings: (updates: Partial<AppSettings>) =>
    request<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
}
