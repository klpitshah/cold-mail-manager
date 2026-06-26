import type { Contact, ScheduledSend } from '../types'
import { formatScheduledAt } from '../utils/scheduleDate'

interface ScheduledSendsBannerProps {
  scheduledSends: ScheduledSend[]
  contacts: Contact[]
  onCancel: (id: string) => void
}

export function ScheduledSendsBanner({
  scheduledSends,
  contacts,
  onCancel,
}: ScheduledSendsBannerProps) {
  const pending = scheduledSends.filter((item) => item.status === 'pending')
  if (pending.length === 0) return null

  return (
    <div className="mb-4 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-violet-900">
          {pending.length} scheduled send{pending.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-violet-700">Sends when this app is open with Gmail connected</p>
      </div>
      <div className="space-y-2">
        {pending.map((item) => {
          const contact = contacts.find((entry) => entry.id === item.contactId)
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm text-slate-800 truncate">
                  {contact?.name ?? 'Unknown contact'}
                  <span className="text-slate-500">
                    {' '}
                    · {item.type === 'initial' ? 'First email' : 'Follow-up'}
                  </span>
                </p>
                <p className="text-xs text-violet-700">{formatScheduledAt(item.sendAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => onCancel(item.id)}
                className="text-xs font-medium text-slate-500 hover:text-red-600 shrink-0"
              >
                Cancel
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
