export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function defaultScheduleDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return date
}

export function defaultScheduleInputValue(): string {
  return toDatetimeLocalValue(defaultScheduleDate())
}

export function parseDatetimeLocalValue(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function minScheduleInputValue(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() + 1)
  return toDatetimeLocalValue(date)
}

export function formatScheduledAt(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / (1000 * 60))

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const datePart = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  if (diffMins <= 0) return `Due now · ${time}`
  if (diffMins < 60) return `In ${diffMins}m · ${time}`
  if (diffMins < 24 * 60) {
    const hours = Math.floor(diffMins / 60)
    return `In ${hours}h · ${time}`
  }
  return `${datePart}, ${time}`
}
