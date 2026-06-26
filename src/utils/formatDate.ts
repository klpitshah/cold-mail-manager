export function formatLastSent(dateStr: string | null): string {
  if (!dateStr) return 'Never sent'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Yesterday, ${time}`
  if (diffDays < 7) return `${diffDays}d ago · ${datePart}`
  return datePart
}

export function formatTimelineDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Yesterday, ${time}`
  if (diffDays < 7) return `${datePart}, ${time}`
  return datePart
}
