import { useMemo, useState } from 'react'
import type { Contact, ScheduledSend, ScheduledSendType } from '../types'
import type { EmailTemplateOption } from '../utils/templateRender'
import { CompanyTreeNode } from '../components/CompanyTreeNode'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SendConfirmDialog } from '../components/SendConfirmDialog'
import { FollowUpModal } from '../components/FollowUpModal'
import type { CompanyGroup } from '../types'
import { executeContactSend } from '../utils/executeSend'

type PendingAction =
  | { type: 'send'; contact: Contact; draft: string; sendType: 'initial' }
  | { type: 'delete'; contact: Contact }

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
  followUpOptions: EmailTemplateOption[]
  defaultFollowUpTemplateId: string
  renderFollowUp: (
    templateId: string,
    ctx: { name: string; company: string; yourName: string; followUpCount: number },
  ) => string
  onFollowUpTemplateChange: (templateId: string) => void
  scheduleSend: (input: {
    contactId: string
    type: ScheduledSendType
    sendAt: string
    draft: string
  }) => Promise<unknown>
  getScheduledForContact: (contactId: string, type?: ScheduledSendType) => ScheduledSend | undefined
}

export function OutreachTreePage({
  contacts,
  token,
  onGmailRequired,
  onRecordSend,
  onEdit,
  onDelete,
  yourName,
  followUpOptions,
  defaultFollowUpTemplateId,
  renderFollowUp,
  onFollowUpTemplateChange,
  scheduleSend,
  getScheduledForContact,
}: OutreachTreePageProps) {
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [followUpContact, setFollowUpContact] = useState<Contact | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

  async function doSend(id: string) {
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
      const result = await executeContactSend(token, contact, contact.mailDraft, 'initial')
      await onRecordSend(id, result, false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setSendingId(null)
    }
  }

  function requestSend(id: string) {
    const contact = contacts.find((c) => c.id === id)
    if (!contact?.email) {
      setError('Add an email address before sending')
      return
    }
    setPendingAction({ type: 'send', contact, draft: contact.mailDraft, sendType: 'initial' })
  }

  function requestDelete(id: string) {
    const contact = contacts.find((c) => c.id === id)
    if (!contact) return
    setPendingAction({ type: 'delete', contact })
  }

  async function confirmSendNow() {
    if (!pendingAction || pendingAction.type !== 'send') return
    if (!token) {
      onGmailRequired()
      return
    }
    await doSend(pendingAction.contact.id)
    setPendingAction(null)
  }

  async function confirmSchedule(sendAt: string) {
    if (!pendingAction || pendingAction.type !== 'send') return
    setSchedulingId(pendingAction.contact.id)
    setError(null)
    try {
      await scheduleSend({
        contactId: pendingAction.contact.id,
        type: pendingAction.sendType,
        sendAt,
        draft: pendingAction.draft,
      })
      setPendingAction(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule send')
    } finally {
      setSchedulingId(null)
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return
    if (pendingAction.type === 'send') return
    setDeletingId(pendingAction.contact.id)
    try {
      await onDelete(pendingAction.contact.id)
      setPendingAction(null)
    } finally {
      setDeletingId(null)
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
        <div className="flex gap-3 text-xs text-slate-600">
          <span><strong className="text-slate-800">{stats.companies}</strong> companies</span>
          <span><strong className="text-blue-700">{stats.staged}</strong> staged</span>
          <span><strong className="text-slate-700">{stats.sent}</strong> sent</span>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {companyGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-20 text-center">
          <p className="text-sm text-slate-600">No outreach yet</p>
          <p className="text-xs text-slate-500 mt-1">Stage contacts from the Staging tab while browsing LinkedIn</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companyGroups.map((group) => (
            <CompanyTreeNode
              key={group.company}
              group={group}
              sendingId={sendingId}
              onSend={requestSend}
              onFollowUp={(id) => {
                const c = contacts.find((x) => x.id === id)
                if (c) setFollowUpContact(c)
              }}
              onEdit={onEdit}
              onDelete={requestDelete}
              getScheduledForContact={getScheduledForContact}
            />
          ))}
        </div>
      )}

      {pendingAction?.type === 'send' && (
        <SendConfirmDialog
          title="Send email?"
          message={`Send outreach email to ${pendingAction.contact.name} at ${pendingAction.contact.email}?`}
          sendLabel="Send email"
          scheduleLabel="Schedule email"
          variant="primary"
          loading={sendingId === pendingAction.contact.id || schedulingId === pendingAction.contact.id}
          onSendNow={confirmSendNow}
          onSchedule={confirmSchedule}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {pendingAction?.type === 'delete' && (
        <ConfirmDialog
          title="Delete contact?"
          message={`Remove ${pendingAction.contact.name} at ${pendingAction.contact.company}? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deletingId === pendingAction.contact.id}
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {followUpContact && token && (
        <FollowUpModal
          contact={followUpContact}
          yourName={yourName}
          followUpOptions={followUpOptions}
          defaultFollowUpTemplateId={defaultFollowUpTemplateId}
          renderFollowUp={renderFollowUp}
          onFollowUpTemplateChange={onFollowUpTemplateChange}
          scheduleSend={scheduleSend}
          getScheduledForContact={getScheduledForContact}
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
