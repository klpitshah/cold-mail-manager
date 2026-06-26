import { useEffect, useState } from 'react'
import type { Contact } from '../types'
import { buildFollowUpEmail } from '../utils/emailTemplates'
import { sendEmail, sendReply } from '../services/gmail'

interface FollowUpModalProps {
  contact: Contact
  yourName: string
  token: string
  onClose: () => void
  onSent: (result: { messageId: string; threadId: string; subject: string }) => void
}

export function FollowUpModal({ contact, yourName, token, onClose, onSent }: FollowUpModalProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(buildFollowUpEmail(contact.name, contact.company, contact.followUpCount + 1, yourName))
  }, [contact, yourName])

  async function handleSend() {
    if (!contact.email) {
      setError('No email address on this contact')
      return
    }
    setSending(true)
    setError(null)
    try {
      let result
      if (contact.gmailThreadId && contact.gmailMessageId && contact.lastSubject) {
        result = await sendReply(
          token,
          contact.email,
          draft,
          contact.gmailThreadId,
          contact.gmailMessageId,
          contact.lastSubject,
        )
      } else {
        result = await sendEmail(token, contact.email, draft, {
          threadId: contact.gmailThreadId ?? undefined,
        })
      }
      onSent(result)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send follow-up')
    } finally {
      setSending(false)
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
        </div>

        <div className="p-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-64 text-sm leading-relaxed text-slate-700 font-mono resize-none rounded-lg border border-slate-200 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            spellCheck
          />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-5 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition shadow-sm disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send follow-up via Gmail'}
          </button>
        </div>
      </div>
    </div>
  )
}
