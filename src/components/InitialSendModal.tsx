import { useEffect, useState } from 'react'
import type { Contact, ScheduledSend, ScheduledSendType } from '../types'
import { SendConfirmDialog } from './SendConfirmDialog'
import { TemplateSelect } from './TemplateSelect'
import type { EmailTemplateOption } from '../utils/templateRender'
import { executeContactSend } from '../utils/executeSend'
import { formatScheduledAt } from '../utils/scheduleDate'

interface InitialSendModalProps {
  contact: Contact
  yourName: string
  mainTemplateOptions: EmailTemplateOption[]
  defaultInitialTemplateId: string
  renderMain: (
    templateId: string,
    ctx: {
      name: string
      company: string
      linkedinLink: string
      jobLink: string
      yourName: string
      role: string
    },
  ) => string
  onMainTemplateChange: (templateId: string) => void
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

export function InitialSendModal({
  contact,
  yourName,
  mainTemplateOptions,
  defaultInitialTemplateId,
  renderMain,
  onMainTemplateChange,
  scheduleSend,
  getScheduledForContact,
  token,
  onClose,
  onSent,
}: InitialSendModalProps) {
  const [templateId, setTemplateId] = useState(
    contact.initialTemplateId || defaultInitialTemplateId,
  )
  const [draft, setDraft] = useState(contact.mailDraft)
  const [sending, setSending] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scheduled = getScheduledForContact(contact.id, 'initial')

  useEffect(() => {
    setTemplateId(contact.initialTemplateId || defaultInitialTemplateId)
    setDraft(contact.mailDraft)
    setShowConfirm(false)
    setError(null)
  }, [contact.id, contact.mailDraft, contact.initialTemplateId, defaultInitialTemplateId])

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId)
    onMainTemplateChange(nextTemplateId)
    setDraft(
      renderMain(nextTemplateId, {
        name: contact.name,
        company: contact.company,
        linkedinLink: contact.linkedinLink,
        jobLink: contact.jobLink,
        yourName,
        role: contact.role,
      }),
    )
  }

  async function handleSendNow() {
    if (!contact.email) {
      setError('No email address on this contact')
      return
    }
    if (!draft.trim()) {
      setError('Email draft is empty')
      return
    }
    setSending(true)
    setError(null)
    try {
      const result = await executeContactSend(token, contact, draft, 'initial')
      onSent(result)
      setShowConfirm(false)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  async function handleSchedule(sendAt: string) {
    if (!draft.trim()) {
      setError('Email draft is empty')
      return
    }
    setScheduling(true)
    setError(null)
    try {
      await scheduleSend({
        contactId: contact.id,
        type: 'initial',
        sendAt,
        draft,
      })
      setShowConfirm(false)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule email')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Review email to {contact.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {contact.company}
            {contact.email && ` · ${contact.email}`}
          </p>
          {scheduled && (
            <p className="text-xs text-violet-700 mt-1">
              Scheduled · {formatScheduledAt(scheduled.sendAt)}
            </p>
          )}
        </div>

        <div className="p-6 space-y-4">
          <TemplateSelect
            label="Email template"
            value={templateId}
            options={mainTemplateOptions}
            onChange={handleTemplateChange}
          />
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email draft</label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full h-64 text-sm leading-relaxed text-slate-700 font-mono resize-y rounded-lg border border-slate-200 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              spellCheck
            />
          </div>
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
            disabled={sending || scheduling || !draft.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
          >
            {scheduled ? 'Send / reschedule' : 'Send via Gmail'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <SendConfirmDialog
          title="Send email?"
          message={`Send outreach email to ${contact.name} at ${contact.email}?`}
          sendLabel="Send email"
          scheduleLabel="Schedule email"
          variant="primary"
          loading={sending || scheduling}
          onSendNow={handleSendNow}
          onSchedule={handleSchedule}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
