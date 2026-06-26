export interface AgingInfo {
  days: number
  label: string
  color: string
  barColor: string
  percent: number
  urgency: 'fresh' | 'warm' | 'aging' | 'stale'
}

const MAX_DAYS = 21

export function getDaysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getAgingInfo(lastContactDate: string | null): AgingInfo {
  if (!lastContactDate) {
    return {
      days: 0,
      label: 'Not sent',
      color: 'text-slate-500',
      barColor: 'bg-slate-300',
      percent: 0,
      urgency: 'stale',
    }
  }

  const days = getDaysSince(lastContactDate)

  if (days <= 3) {
    return {
      days,
      label: days === 0 ? 'Today' : `${days}d ago`,
      color: 'text-emerald-600',
      barColor: 'bg-emerald-400',
      percent: Math.min((days / MAX_DAYS) * 100, 100),
      urgency: 'fresh',
    }
  }
  if (days <= 7) {
    return {
      days,
      label: `${days}d ago`,
      color: 'text-amber-600',
      barColor: 'bg-amber-400',
      percent: Math.min((days / MAX_DAYS) * 100, 100),
      urgency: 'warm',
    }
  }
  if (days <= 14) {
    return {
      days,
      label: `${days}d ago`,
      color: 'text-orange-600',
      barColor: 'bg-orange-400',
      percent: Math.min((days / MAX_DAYS) * 100, 100),
      urgency: 'aging',
    }
  }
  return {
    days,
    label: `${days}d ago`,
    color: 'text-red-600',
    barColor: 'bg-red-400',
    percent: 100,
    urgency: 'stale',
  }
}
