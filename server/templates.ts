import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  EmailTemplateFile,
  EmailTemplateOption,
  TemplateCatalog,
} from '../src/utils/templateRender.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(__dirname, '..', 'template')
export const MAIN_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'main')
export const FOLLOW_UP_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'follow-up')

function loadTemplatesFromDir(dir: string): Record<string, EmailTemplateFile> {
  if (!fs.existsSync(dir)) return {}

  const templates: Record<string, EmailTemplateFile> = {}
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const id = file.slice(0, -5)
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
    templates[id] = JSON.parse(raw) as EmailTemplateFile
  }
  return templates
}

function pickDefault(templates: Record<string, EmailTemplateFile>): string {
  const marked = Object.entries(templates).find(([, template]) => template.default)
  if (marked) return marked[0]
  const ids = Object.keys(templates).sort()
  return ids[0] ?? ''
}

let cachedCatalog: TemplateCatalog | null = null

export function loadTemplateCatalog(): TemplateCatalog {
  if (cachedCatalog) return cachedCatalog

  const main = loadTemplatesFromDir(MAIN_TEMPLATE_DIR)
  const followUp = loadTemplatesFromDir(FOLLOW_UP_TEMPLATE_DIR)

  cachedCatalog = {
    main,
    followUp,
    defaults: {
      main: pickDefault(main),
      followUp: pickDefault(followUp),
    },
  }
  return cachedCatalog
}

export function listTemplateOptions(): {
  main: EmailTemplateOption[]
  followUp: EmailTemplateOption[]
  defaults: TemplateCatalog['defaults']
} {
  const catalog = loadTemplateCatalog()
  return {
    main: Object.entries(catalog.main)
      .map(([id, template]) => ({
        id,
        label: template.label,
        description: template.description ?? '',
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    followUp: Object.entries(catalog.followUp)
      .map(([id, template]) => ({
        id,
        label: template.label,
        description: template.description ?? '',
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    defaults: catalog.defaults,
  }
}

export function isKnownMainTemplateId(id: string): boolean {
  return id in loadTemplateCatalog().main
}

export function isKnownFollowUpTemplateId(id: string): boolean {
  return id in loadTemplateCatalog().followUp
}

export function resolveMainTemplateId(id: string | undefined): string {
  const catalog = loadTemplateCatalog()
  if (id && catalog.main[id]) return id
  return catalog.defaults.main
}

export function resolveFollowUpTemplateId(id: string | undefined): string {
  const catalog = loadTemplateCatalog()
  if (id && catalog.followUp[id]) return id
  return catalog.defaults.followUp
}
