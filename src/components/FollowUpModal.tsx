import { useEffect, useState } from 'react'
import type { Contact, ScheduledSend, ScheduledSendType } from '../types'
import { SendConfirmDialog } from './SendConfirmDialog'
import { TemplateSelect } from './TemplateSelect'
import type { EmailTemplateOption } from '../utils/templateRender'
import { executeContactSend } from '../utils/executeSend'
import { formatScheduledAt } from '../utils/scheduleDate'

interface FollowUpModalProps {
  contact: Contact
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
  token: string
  onClose: () => void
  onSent: (result: { messageId: string; threadId: string; subject: string }) => void
}

export function FollowUpModal({
  contact,
  yourName,
  followUpOptions,
  defaultFollowUpTemplateId,
  renderFollowUp,
  onFollowUpTemplateChange,
  scheduleSend,
  getScheduledForContact,
  token,
  onClose,
  onSent,
}: FollowUpModalProps) {
  const [followUpTemplateId, setFollowUpTemplateId] = useState(defaultFollowUpTemplateId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scheduled = getScheduledForContact(contact.id, 'follow-up')

  useEffect(() => {
    setFollowUpTemplateId(defaultFollowUpTemplateId)
  }, [defaultFollowUpTemplateId, contact.id])

  useEffect(() => {
    setDraft(
      renderFollowUp(followUpTemplateId, {
        name: contact.name,
        company: contact.company,
        yourName,
        followUpCount: contact.followUpCount + 1,
      }),
    )
  }, [contact, yourName, followUpTemplateId, renderFollowUp])

  function handleTemplateChange(templateId: string) {
    setFollowUpTemplateId(templateId)
    onFollowUpTemplateChange(templateId)
  }

  async function handleSendNow() {
    if (!contact.email) {
      setError('No email address on this contact')
      return
    }
    setSending(true)
    setError(null)
    try {
      const result = await executeContactSend(token, contact, draft, 'follow-up')
      onSent(result)
      setShowConfirm(false)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send follow-up')
    } finally {
      setSending(false)
    }
  }

  async function handleSchedule(sendAt: string) {
    setScheduling(true)
    setError(null)
    try {
      await scheduleSend({
        contactId: contact.id,
        type: 'follow-up',
        sendAt,
        draft,
      })
      setShowConfirm(false)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule follow-up')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Follow up with {contact.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {contact.company} · Follow-up #{contact.followUpCount + 1}
            {contact.gmailThreadId && (
              <span className="text-emerald-600"> · will reply in thread</span>
            )}
          </p>
          {scheduled && (
            <p className="text-xs text-violet-700 mt-1">
              Scheduled · {formatScheduledAt(scheduled.sendAt)}
            </p>
          )}
        </div>

        <div className="p-6 space-y-4">
          <TemplateSelect
            label="Follow-up template"
            value={followUpTemplateId}
            options={followUpOptions}
            onChange={handleTemplateChange}
          />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-64 text-sm leading-relaxed text-slate-700 font-mono resize-none rounded-lg border border-slate-200 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            spellCheck
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={sending || scheduling}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={sending || scheduling}
            className="px-5 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition shadow-sm disabled:opacity-60"
          >
            {scheduled ? 'Send / reschedule' : 'Send follow-up via Gmail'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <SendConfirmDialog
          title="Send follow-up?"
          message={`Send follow-up #${contact.followUpCount + 1} to ${contact.name} at ${contact.email}?`}
          sendLabel="Send follow-up"
          scheduleLabel="Schedule follow-up"
          variant="warning"
          loading={sending || scheduling}
          onSendNow={handleSendNow}
          onSchedule={handleSchedule}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
