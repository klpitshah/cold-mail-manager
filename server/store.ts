import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Contact } from '../src/types.js'
import { normalizeSendHistory } from '../src/utils/sendHistory.js'
import {
  isKnownMainTemplateId,
  resolveFollowUpTemplateId,
  resolveMainTemplateId,
} from './templates.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.join(__dirname, '..', 'data')
export const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json')
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

export interface StoredSettings {
  yourName: string
  defaultInitialTemplate?: string
  defaultFollowUpTemplate?: string
}

function normalizeSettings(raw: StoredSettings) {
  return {
    yourName: raw.yourName ?? '',
    defaultInitialTemplate: resolveMainTemplateId(raw.defaultInitialTemplate),
    defaultFollowUpTemplate: resolveFollowUpTemplateId(raw.defaultFollowUpTemplate),
  }
}

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

export function readContacts<T extends Contact>() {
  const contacts = readJsonFile<T[]>(CONTACTS_FILE, [])
  let migrated = false
  const normalized = contacts.map((contact) => {
    let next = contact
    if (!contact.sendHistory?.length) {
      migrated = true
      next = { ...next, sendHistory: normalizeSendHistory(contact) }
    }
    if (!contact.initialTemplateId || !isKnownMainTemplateId(contact.initialTemplateId)) {
      migrated = true
      next = { ...next, initialTemplateId: resolveMainTemplateId(contact.initialTemplateId) }
    }
    return next
  })
  if (migrated) writeJsonFile(CONTACTS_FILE, normalized)
  return normalized as T[]
}

export function writeContacts<T>(contacts: T[]) {
  writeJsonFile(CONTACTS_FILE, contacts)
}

export function readSettings() {
  const raw = readJsonFile<StoredSettings>(SETTINGS_FILE, { yourName: '' })
  const settings = normalizeSettings(raw)
  if (
    !('defaultInitialTemplate' in raw) ||
    !('defaultFollowUpTemplate' in raw) ||
    raw.defaultInitialTemplate !== settings.defaultInitialTemplate ||
    raw.defaultFollowUpTemplate !== settings.defaultFollowUpTemplate
  ) {
    writeJsonFile(SETTINGS_FILE, settings)
  }
  return settings
}

export function writeSettings(settings: ReturnType<typeof normalizeSettings>) {
  writeJsonFile(SETTINGS_FILE, settings)
}
