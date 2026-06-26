import { useState } from 'react'
import type { CompanyGroup, ScheduledSend, ScheduledSendType } from '../types'
import { TreeContactRow } from './TreeContactRow'

interface CompanyTreeNodeProps {
  group: CompanyGroup
  sendingId: string | null
  onSend: (id: string) => void
  onFollowUp: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  getScheduledForContact: (contactId: string, type?: ScheduledSendType) => ScheduledSend | undefined
}

export function CompanyTreeNode({
  group,
  sendingId,
  onSend,
  onFollowUp,
  onEdit,
  onDelete,
  getScheduledForContact,
}: CompanyTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const staged = group.contacts.filter((c) => c.status === 'staged').length
  const sent = group.contacts.filter((c) => c.status === 'sent').length

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left"
      >
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-blue-600">
            {group.company.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-900">{group.company}</span>
          <span className="text-xs text-slate-500 ml-2">
            {group.contacts.length} contact{group.contacts.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {staged > 0 && (
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {staged} staged
            </span>
          )}
          {sent > 0 && (
            <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {sent} sent
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-2 pb-2">
          {/* Column headers */}
          <div className="hidden md:flex items-center gap-3 py-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            <div className="w-6" />
            <div className="w-2" />
            <div className="flex-1">Contact</div>
            <div className="w-44">Timeline</div>
            <div className="w-24">Aging</div>
            <div className="w-32" />
          </div>

          {group.contacts.map((contact) => (
            <TreeContactRow
              key={contact.id}
              contact={contact}
              scheduledInitial={getScheduledForContact(contact.id, 'initial')}
              scheduledFollowUp={getScheduledForContact(contact.id, 'follow-up')}
              sending={sendingId === contact.id}
              onSend={() => onSend(contact.id)}
              onFollowUp={() => onFollowUp(contact.id)}
              onEdit={() => onEdit(contact.id)}
              onDelete={() => onDelete(contact.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
