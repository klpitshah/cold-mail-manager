export function migrateContactLinks(raw: { jobLink?: string; linkedinLink?: string }): {
  jobLink: string
  linkedinLink: string
} {
  if (Object.prototype.hasOwnProperty.call(raw, 'linkedinLink')) {
    return {
      jobLink: (raw.jobLink ?? '').trim(),
      linkedinLink: (raw.linkedinLink ?? '').trim(),
    }
  }

  return {
    linkedinLink: (raw.jobLink ?? '').trim(),
    jobLink: '',
  }
}
