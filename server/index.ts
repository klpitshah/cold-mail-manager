import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import { readContacts, writeContacts, readSettings, writeSettings } from './store.js'
import type { Contact } from '../src/types.js'

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
    jobLink: (data.jobLink ?? '').trim(),
    mailDraft: (data.mailDraft ?? '').trim(),
    notes: (data.notes ?? '').trim(),
    status: 'staged',
    lastSentAt: null,
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
  writeContacts(incoming)
  res.json(incoming)
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
  const contacts = readContacts<Contact>()
  const idx = contacts.findIndex((c) => c.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const c = contacts[idx]
  contacts[idx] = {
    ...c,
    status: 'sent',
    lastSentAt: new Date().toISOString(),
    followUpCount: isFollowUp ? c.followUpCount + 1 : c.followUpCount,
    gmailThreadId: result.threadId,
    gmailMessageId: result.messageId,
    lastSubject: result.subject,
  }
  writeContacts(contacts)
  res.json(contacts[idx])
})

app.delete('/api/contacts/:id', (req, res) => {
  const contacts = readContacts<Contact>()
  const filtered = contacts.filter((c) => c.id !== req.params.id)
  if (filtered.length === contacts.length) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  writeContacts(filtered)
  res.status(204).end()
})

app.get('/api/settings', (_req, res) => {
  res.json(readSettings())
})

app.put('/api/settings', (req, res) => {
  const settings = { yourName: req.body.yourName ?? '' }
  writeSettings(settings)
  res.json(settings)
})

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
