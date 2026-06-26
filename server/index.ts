import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import { recordContactSend } from './contactActions.js'
import { readContacts, writeContacts, readSettings, writeSettings } from './store.js'
import type { Contact } from '../src/types.js'
import { normalizeSendHistory } from '../src/utils/sendHistory.js'
import {
  isKnownFollowUpTemplateId,
  isKnownMainTemplateId,
  listTemplateOptions,
  loadTemplateCatalog,
  resolveMainTemplateId,
} from './templates.js'
import {
  createScheduledSend,
  deleteScheduledSend,
  deleteScheduledSendsForContact,
  readScheduledSends,
} from './scheduled.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/contacts', (_req, res) => {
  res.json(readContacts<Contact>())
})

app.post('/api/contacts', (req, res) => {
  const data = req.body
  const contact: Contact = {
    id: randomUUID(),
    name: (data.name ?? '').trim(),
    company: (data.company ?? '').trim(),
    email: (data.email ?? '').trim(),
    role: (data.role ?? '').trim(),
    linkedinLink: (data.linkedinLink ?? '').trim(),
    jobLink: (data.jobLink ?? '').trim(),
    mailDraft: (data.mailDraft ?? '').trim(),
    initialTemplateId: resolveMainTemplateId(data.initialTemplateId),
    notes: (data.notes ?? '').trim(),
    status: 'staged',
    lastSentAt: null,
    sendHistory: [],
    followUpCount: 0,
    createdAt: new Date().toISOString(),
    gmailThreadId: null,
    gmailMessageId: null,
    lastSubject: null,
  }
  const contacts = readContacts<Contact>()
  contacts.push(contact)
  writeContacts(contacts)
  res.status(201).json(contact)
})

app.post('/api/contacts/bulk', (req, res) => {
  const incoming = req.body.contacts as Contact[]
  if (!Array.isArray(incoming)) {
    res.status(400).json({ error: 'contacts array required' })
    return
  }
  const existing = readContacts<Contact>()
  if (existing.length > 0) {
    res.status(409).json({ error: 'Contacts already exist' })
    return
  }
  writeContacts(incoming.map((c) => ({ ...c, sendHistory: normalizeSendHistory(c) })))
  res.json(readContacts<Contact>())
})

app.patch('/api/contacts/:id', (req, res) => {
  const contacts = readContacts<Contact>()
  const idx = contacts.findIndex((c) => c.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  contacts[idx] = { ...contacts[idx], ...req.body, id: contacts[idx].id }
  writeContacts(contacts)
  res.json(contacts[idx])
})

app.post('/api/contacts/:id/record-send', (req, res) => {
  const { result, isFollowUp } = req.body as {
    result: { messageId: string; threadId: string; subject: string }
    isFollowUp: boolean
  }
  const updated = recordContactSend(req.params.id, result, isFollowUp)
  if (!updated) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(updated)
})

app.delete('/api/contacts/:id', (req, res) => {
  const contacts = readContacts<Contact>()
  const filtered = contacts.filter((c) => c.id !== req.params.id)
  if (filtered.length === contacts.length) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  writeContacts(filtered)
  deleteScheduledSendsForContact(req.params.id)
  res.status(204).end()
})

app.get('/api/scheduled-sends', (_req, res) => {
  res.json(readScheduledSends())
})

app.post('/api/scheduled-sends', (req, res) => {
  const { contactId, type, sendAt, draft } = req.body as {
    contactId?: string
    type?: string
    sendAt?: string
    draft?: string
  }

  if (!contactId || (type !== 'initial' && type !== 'follow-up')) {
    res.status(400).json({ error: 'contactId and valid type required' })
    return
  }
  if (!sendAt || Number.isNaN(Date.parse(sendAt))) {
    res.status(400).json({ error: 'Valid sendAt required' })
    return
  }
  if (new Date(sendAt).getTime() <= Date.now()) {
    res.status(400).json({ error: 'Scheduled time must be in the future' })
    return
  }
  if (!draft?.trim()) {
    res.status(400).json({ error: 'draft required' })
    return
  }

  const contacts = readContacts<Contact>()
  if (!contacts.some((contact) => contact.id === contactId)) {
    res.status(404).json({ error: 'Contact not found' })
    return
  }

  const scheduled = createScheduledSend({
    contactId,
    type,
    sendAt,
    draft,
  })
  res.status(201).json(scheduled)
})

app.delete('/api/scheduled-sends/:id', (req, res) => {
  if (!deleteScheduledSend(req.params.id)) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.status(204).end()
})

app.get('/api/templates', (_req, res) => {
  const catalog = loadTemplateCatalog()
  res.json({
    ...listTemplateOptions(),
    catalog,
  })
})

app.get('/api/settings', (_req, res) => {
  res.json(readSettings())
})

app.put('/api/settings', (req, res) => {
  const current = readSettings()
  const next = {
    yourName: typeof req.body.yourName === 'string' ? req.body.yourName : current.yourName,
    defaultInitialTemplate:
      typeof req.body.defaultInitialTemplate === 'string' &&
      isKnownMainTemplateId(req.body.defaultInitialTemplate)
        ? req.body.defaultInitialTemplate
        : current.defaultInitialTemplate,
    defaultFollowUpTemplate:
      typeof req.body.defaultFollowUpTemplate === 'string' &&
      isKnownFollowUpTemplateId(req.body.defaultFollowUpTemplate)
        ? req.body.defaultFollowUpTemplate
        : current.defaultFollowUpTemplate,
  }
  writeSettings(next)
  res.json(next)
})

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
