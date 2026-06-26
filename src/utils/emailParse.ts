export function parseEmailDraft(draft: string): { subject: string; body: string } {
  const lines = draft.split('\n')
  const subjectLine = lines.find((l) => l.startsWith('Subject:'))
  const subject = subjectLine?.replace(/^Subject:\s*/, '').trim() ?? 'Connect'
  const bodyStart = subjectLine ? lines.indexOf(subjectLine) + 1 : 0
  const body = lines
    .slice(bodyStart)
    .join('\n')
    .replace(/^\n+/, '')
    .trim()
  return { subject, body }
}

export function buildDraft(subject: string, body: string): string {
  return `Subject: ${subject}\n\n${body}`
}
