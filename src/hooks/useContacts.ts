import { useCallback, useEffect, useState } from 'react'
import { api, type StagingInput } from '../api/client'
import type { Contact, ContactStatus } from '../types'
import { migrateContactLinks } from '../utils/contactLinks'
import { normalizeSendHistory } from '../utils/sendHistory'

const LEGACY_STORAGE_KEY = 'mailtracker-contacts'

interface LegacyContact extends Partial<Contact> {
  lastContactDate?: string | null
}

function migrateContact(raw: LegacyContact): Contact {
  const initialTemplateId = raw.initialTemplateId ?? ''
  const links = migrateContactLinks(raw)
  const contact: Contact = {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name ?? '',
    company: raw.company ?? '',
    email: raw.email ?? '',
    role: raw.role ?? '',
    linkedinLink: links.linkedinLink,
    jobLink: links.jobLink,
    mailDraft: raw.mailDraft ?? '',
    initialTemplateId,
    status: migrateStatus(raw),
    lastSentAt: raw.lastSentAt ?? raw.lastContactDate ?? null,
    sendHistory: raw.sendHistory ?? [],
    followUpCount: raw.followUpCount ?? 0,
    notes: raw.notes ?? '',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    gmailThreadId: raw.gmailThreadId ?? null,
    gmailMessageId: raw.gmailMessageId ?? null,
    lastSubject: raw.lastSubject ?? null,
  }
  return { ...contact, sendHistory: normalizeSendHistory(contact) }
}

function migrateStatus(raw: LegacyContact): ContactStatus {
  if (raw.status === 'staged' || raw.status === 'sent') return raw.status
  if (raw.status === 'replied') return 'replied'
  if (raw.status === 'no_response') return 'no_response'
  if (raw.lastSentAt || raw.lastContactDate) return 'sent'
  return 'staged'
}

function loadLegacyContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as LegacyContact[]).map(migrateContact)
  } catch {
    return []
  }
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const data = await api.getContacts()
    setContacts(data)
    return data
  }, [])

  useEffect(() => {
    async function init() {
      try {
        let data = await api.getContacts()

        if (data.length === 0) {
          const legacy = loadLegacyContacts()
          if (legacy.length > 0) {
            try {
              data = await api.bulkImport(legacy)
              localStorage.removeItem(LEGACY_STORAGE_KEY)
            } catch {
              // bulk import failed (e.g. race) - use legacy locally
              data = legacy
            }
          }
        }

        setContacts(data)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contacts')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const addContact = useCallback(async (data: StagingInput) => {
    const contact = await api.createContact(data)
    setContacts((prev) => [...prev, contact])
    return contact
  }, [])

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    const contact = await api.updateContact(id, updates)
    setContacts((prev) => prev.map((c) => (c.id === id ? contact : c)))
  }, [])

  const recordSend = useCallback(
    async (
      id: string,
      result: { messageId: string; threadId: string; subject: string },
      isFollowUp: boolean,
    ) => {
      const contact = await api.recordSend(id, result, isFollowUp)
      setContacts((prev) => prev.map((c) => (c.id === id ? contact : c)))
    },
    [],
  )

  const deleteContact = useCallback(async (id: string) => {
    await api.deleteContact(id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { contacts, loading, error, refresh, addContact, updateContact, recordSend, deleteContact }
}

export type { StagingInput }
