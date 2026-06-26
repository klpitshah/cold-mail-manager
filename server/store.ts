import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.join(__dirname, '..', 'data')
export const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json')
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

export interface StoredSettings {
  yourName: string
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

export function readContacts<T>() {
  return readJsonFile<T[]>(CONTACTS_FILE, [])
}

export function writeContacts<T>(contacts: T[]) {
  writeJsonFile(CONTACTS_FILE, contacts)
}

export function readSettings(): StoredSettings {
  return readJsonFile<StoredSettings>(SETTINGS_FILE, { yourName: '' })
}

export function writeSettings(settings: StoredSettings) {
  writeJsonFile(SETTINGS_FILE, settings)
}
