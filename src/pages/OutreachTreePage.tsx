import { useMemo, useState } from 'react'
import type { Contact } from '../types'
import { CompanyTreeNode } from '../components/CompanyTreeNode'
import { FollowUpModal } from '../components/FollowUpModal'
import type { CompanyGroup } from '../types'
import { sendEmail } from '../services/gmail'

interface OutreachTreePageProps {
  contacts: Contact[]
  token: string | null
  onGmailRequired: () => void
  onRecordSend: (
    id: string,
    result: { messageId: string; threadId: string; subject: string },
    isFollowUp: boolean,
  ) => Promise<void>
  onEdit: (id: string) => void
  onDelete: (id: string) => Promise<void>
  yourName: string
}

export function OutreachTreePage({
  contacts,
  token,
  onGmailRequired,
  onRecordSend,
  onEdit,
  onDelete,
  yourName,
}: OutreachTreePageProps) {
  const [search, setSearch] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [followUpContact, setFollowUpContact] = useState<Contact | null>(null)
  const [error, setError] = useState<string | null>(null)

  const companyGroups = useMemo(() => {
    const filtered = contacts.filter((c) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    })

    const map = new Map<string, CompanyGroup>()
    for (const contact of filtered) {
      const existing = map.get(contact.company)
      if (existing) {
        existing.contacts.push(contact)
      } else {
        map.set(contact.company, { company: contact.company, contacts: [contact] })
      }
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        contacts: g.contacts.sort((a, b) => {
          if (a.status === 'staged' && b.status !== 'staged') return -1
          if (a.status !== 'staged' && b.status === 'staged') return 1
          return a.name.localeCompare(b.name)
        }),
      }))
      .sort((a, b) => a.company.localeCompare(b.company))
  }, [contacts, search])

  async function handleSend(id: string) {
    if (!token) {
      onGmailRequired()
      return
    }
    const contact = contacts.find((c) => c.id === id)
    if (!contact?.email) {
      setError('Add an email address before sending')
      return
    }
    setSendingId(id)
    setError(null)
    try {
      const result = await sendEmail(token, contact.email, contact.mailDraft)
      onRecordSend(id, result, false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setSendingId(null)
    }
  }

  const stats = useMemo(() => ({
    companies: new Set(contacts.map((c) => c.company)).size,
    staged: contacts.filter((c) => c.status === 'staged').length,
    sent: contacts.filter((c) => c.status === 'sent').length,
  }), [contacts])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies or contacts..."
          className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition shadow-sm"
        />
        <div className="flex gap-3 text-xs text-slate-500">
          <span><strong className="text-slate-700">{stats.companies}</strong> companies</span>
          <span><strong className="text-blue-600">{stats.staged}</strong> staged</span>
          <span><strong className="text-slate-600">{stats.sent}</strong> sent</span>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {companyGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-20 text-center">
          <p className="text-sm text-slate-500">No outreach yet</p>
          <p className="text-xs text-slate-400 mt-1">Stage contacts from the Staging tab while browsing LinkedIn</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companyGroups.map((group) => (
            <CompanyTreeNode
              key={group.company}
              group={group}
              sendingId={sendingId}
              onSend={handleSend}
              onFollowUp={(id) => {
                const c = contacts.find((x) => x.id === id)
                if (c) setFollowUpContact(c)
              }}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {followUpContact && token && (
        <FollowUpModal
          contact={followUpContact}
          yourName={yourName}
          token={token}
          onClose={() => setFollowUpContact(null)}
          onSent={(result) => onRecordSend(followUpContact.id, result, true)}
        />
      )}

      {followUpContact && !token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-xl p-6 text-center">
            <p className="text-sm text-slate-600 mb-4">Connect Gmail to send follow-ups</p>
            <button
              onClick={() => {
                setFollowUpContact(null)
                onGmailRequired()
              }}
              className="text-sm text-blue-600 font-medium"
            >
              Connect Gmail
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
