import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ScheduledSend, ScheduledSendType } from '../src/types.js'
import { DATA_DIR } from './store.js'

const SCHEDULED_SENDS_FILE = path.join(DATA_DIR, 'scheduled-sends.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureDataDir()
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, fallback)
    return fallback
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

function writeJsonFile<T>(filePath: string, data: T) {
  ensureDataDir()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export function readScheduledSends(): ScheduledSend[] {
  return readJsonFile<ScheduledSend[]>(SCHEDULED_SENDS_FILE, [])
}

export function writeScheduledSends(sends: ScheduledSend[]) {
  writeJsonFile(SCHEDULED_SENDS_FILE, sends)
}

export function createScheduledSend(input: {
  contactId: string
  type: ScheduledSendType
  sendAt: string
  draft: string
}): ScheduledSend {
  const sends = readScheduledSends()
  const withoutExisting = sends.filter(
    (item) =>
      !(
        item.contactId === input.contactId &&
        item.type === input.type &&
        item.status === 'pending'
      ),
  )
  const scheduled: ScheduledSend = {
    id: randomUUID(),
    contactId: input.contactId,
    type: input.type,
    sendAt: input.sendAt,
    draft: input.draft.trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  withoutExisting.push(scheduled)
  writeScheduledSends(withoutExisting)
  return scheduled
}

export function deleteScheduledSend(id: string): boolean {
  const sends = readScheduledSends()
  const filtered = sends.filter((item) => item.id !== id)
  if (filtered.length === sends.length) return false
  writeScheduledSends(filtered)
  return true
}

export function updateScheduledSend(
  id: string,
  updates: Partial<Pick<ScheduledSend, 'status' | 'error'>>,
): ScheduledSend | null {
  const sends = readScheduledSends()
  const idx = sends.findIndex((item) => item.id === id)
  if (idx === -1) return null
  sends[idx] = { ...sends[idx], ...updates }
  writeScheduledSends(sends)
  return sends[idx]
}

export function deleteScheduledSendsForContact(contactId: string) {
  const sends = readScheduledSends()
  writeScheduledSends(sends.filter((item) => item.contactId !== contactId))
}
