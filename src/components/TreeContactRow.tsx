import type { Contact } from '../types'
import { AgingBar } from './AgingBar'
import { formatLastSent } from '../utils/formatDate'

interface TreeContactRowProps {
  contact: Contact
  onSend: () => void
  onFollowUp: () => void
  onEdit: () => void
  onDelete: () => void
  sending: boolean
}

const statusDot: Record<Contact['status'], string> = {
  staged: 'bg-slate-300',
  sent: 'bg-blue-400',
  replied: 'bg-emerald-400',
  no_response: 'bg-red-400',
}

export function TreeContactRow({
  contact,
  onSend,
  onFollowUp,
  onEdit,
  onDelete,
  sending,
}: TreeContactRowProps) {
  const canFollowUp = contact.status === 'sent' && contact.lastSentAt
  const isStaged = contact.status === 'staged'

  return (
    <div className="group flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition">
      {/* Tree connector */}
      <div className="flex items-center shrink-0 w-6">
        <span className="text-slate-300 font-light">├</span>
      </div>

      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[contact.status]}`} title={contact.status} />

      {/* Name & email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 truncate">{contact.name}</span>
          {contact.role && (
            <span className="text-xs text-slate-400 truncate hidden sm:inline">· {contact.role}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {contact.email && (
            <span className="text-xs text-slate-400 truncate">{contact.email}</span>
          )}
          {contact.jobLink && (
            <a
              href={contact.jobLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-500 hover:text-blue-600 shrink-0"
            >
              job ↗
            </a>
          )}
        </div>
      </div>

      {/* Last sent */}
      <div className="hidden md:block text-xs text-slate-400 w-28 text-right shrink-0">
        {formatLastSent(contact.lastSentAt)}
      </div>

      {/* Follow-up count */}
      {contact.followUpCount > 0 && (
        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
          FU×{contact.followUpCount}
        </span>
      )}

      {/* Aging bar */}
      <div className="w-24 shrink-0 hidden sm:block">
        <AgingBar lastSentAt={contact.lastSentAt} compact />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {isStaged && (
          <button
            onClick={onSend}
            disabled={sending || !contact.email}
            className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {sending ? '…' : 'Send'}
          </button>
        )}
        {canFollowUp && (
          <button
            onClick={onFollowUp}
            className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 border border-amber-200 transition"
          >
            Follow up
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-red-500 rounded transition"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
