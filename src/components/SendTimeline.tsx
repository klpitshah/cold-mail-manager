import { formatTimelineDate } from '../utils/formatDate'
import { normalizeSendHistory } from '../utils/sendHistory'
import type { Contact } from '../types'

interface SendTimelineProps {
  contact: Contact
}

export function SendTimeline({ contact }: SendTimelineProps) {
  const history = normalizeSendHistory(contact)

  if (history.length === 0) {
    return <span className="text-xs text-slate-500">—</span>
  }

  return (
    <div className="space-y-0.5">
      {history.map((date, i) => (
        <div key={`${date}-${i}`} className="text-[11px] leading-tight whitespace-nowrap">
          <span className="font-medium text-slate-600">{i === 0 ? 'First' : `FU ${i}`}</span>
          <span className="text-slate-500"> · </span>
          <span className="text-slate-600">{formatTimelineDate(date)}</span>
        </div>
      ))}
    </div>
  )
}
