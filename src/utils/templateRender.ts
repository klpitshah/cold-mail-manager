export interface EmailTemplateFile {
  label: string
  description?: string
  subject: string
  body: string
  default?: boolean
}

export interface EmailTemplateOption {
  id: string
  label: string
  description: string
}

export interface RenderContext {
  name: string
  company: string
  linkedinLink: string
  jobLink: string
  yourName: string
  role: string
  followUpCount?: number
}

export interface TemplateCatalog {
  main: Record<string, EmailTemplateFile>
  followUp: Record<string, EmailTemplateFile>
  defaults: {
    main: string
    followUp: string
  }
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
}

export function buildTemplateVars(ctx: RenderContext): Record<string, string> {
  const firstName = ctx.name.split(' ')[0] || ctx.name
  const roleNote = ctx.role ? ` as a ${ctx.role}` : ''
  const jobNote = ctx.jobLink
    ? `\n\nI noticed an opening at ${ctx.company} (${ctx.jobLink}) that aligns well with my background.`
    : `\n\nI'm currently exploring opportunities at ${ctx.company} that align with my background.`
  const opening = ctx.jobLink
    ? `I saw a role at ${ctx.company} (${ctx.jobLink}) that looks like a strong fit.`
    : `I'm interested in opportunities at ${ctx.company} and wanted to reach out directly.`
  const compliment = ctx.role
    ? `I've been following ${ctx.company}'s work and was impressed by what your team is doing in ${ctx.role.toLowerCase()} roles.`
    : `I've been following ${ctx.company}'s work and was impressed by what your team is building.`
  const ask = ctx.jobLink
    ? `\n\nI also saw an opening (${ctx.jobLink}) that aligns with my background, and I'd love to learn more about the team.`
    : `\n\nI'm exploring opportunities at ${ctx.company} that match my background, and I'd love to learn more about the team.`
  const followUpCount = ctx.followUpCount ?? 1
  const followUpSubject =
    followUpCount === 1 ? `Following up - ${ctx.company}` : `Re: Following up - ${ctx.company}`

  return {
    firstName,
    name: ctx.name,
    company: ctx.company,
    linkedinLink: ctx.linkedinLink,
    jobLink: ctx.jobLink,
    yourName: ctx.yourName || '[Your Name]',
    role: ctx.role,
    roleNote,
    jobNote,
    opening,
    compliment,
    ask,
    followUpSubject,
  }
}

export function renderTemplate(template: EmailTemplateFile, ctx: RenderContext): string {
  const vars = buildTemplateVars(ctx)
  const subject = interpolate(template.subject, vars)
  const body = interpolate(template.body, vars)
  return `Subject: ${subject}\n\n${body}`
}

export function renderMainEmail(
  catalog: TemplateCatalog,
  templateId: string,
  ctx: Omit<RenderContext, 'followUpCount'>,
): string {
  const template = catalog.main[templateId] ?? catalog.main[catalog.defaults.main]
  if (!template) return ''
  return renderTemplate(template, ctx)
}

export function renderFollowUpEmail(
  catalog: TemplateCatalog,
  templateId: string,
  ctx: Omit<RenderContext, 'jobLink' | 'linkedinLink' | 'role'> & { followUpCount: number },
): string {
  const template = catalog.followUp[templateId] ?? catalog.followUp[catalog.defaults.followUp]
  if (!template) return ''
  return renderTemplate(template, { ...ctx, jobLink: '', linkedinLink: '', role: '' })
}

export function toTemplateOptions(templates: Record<string, EmailTemplateFile>): EmailTemplateOption[] {
  return Object.entries(templates)
    .map(([id, template]) => ({
      id,
      label: template.label,
      description: template.description ?? '',
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function isMainTemplateId(catalog: TemplateCatalog, id: string): boolean {
  return id in catalog.main
}

export function isFollowUpTemplateId(catalog: TemplateCatalog, id: string): boolean {
  return id in catalog.followUp
}

export function resolveMainTemplateId(catalog: TemplateCatalog, id: string | undefined): string {
  if (id && catalog.main[id]) return id
  return catalog.defaults.main
}

export function resolveFollowUpTemplateId(catalog: TemplateCatalog, id: string | undefined): string {
  if (id && catalog.followUp[id]) return id
  return catalog.defaults.followUp
}
