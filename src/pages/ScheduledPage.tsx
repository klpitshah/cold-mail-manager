import { useCallback, useRef, useState } from 'react'
import type { Contact, ScheduledSend } from '../types'
import { formatScheduledAt } from '../utils/scheduleDate'
import { parseEmailDraft, buildDraft } from '../utils/emailParse'
import { api } from '../api/client'
import { syncToSheet, ensureSheetSetup, extractSpreadsheetId } from '../services/sheets'

interface ScheduledPageProps {
  scheduledSends: ScheduledSend[]
  contacts: Contact[]
  onCancel: (id: string) => void
  onUpdate: (id: string, updates: { draft?: string; sendAt?: string }) => Promise<ScheduledSend>
  token: string | null
  scheduledSheetsId: string
  onSheetsIdChange: (id: string) => void
}

export function ScheduledPage({
  scheduledSends,
  contacts,
  onCancel,
  onUpdate,
  token,
  scheduledSheetsId,
  onSheetsIdChange,
}: ScheduledPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editSendAt, setEditSendAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [sheetInput, setSheetInput] = useState('')
  const syncLock = useRef(false)

  const pending = scheduledSends
    .filter((item) => item.status === 'pending')
    .sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime())

  const syncToGoogleSheet = useCallback(async () => {
    if (!scheduledSheetsId || !token || syncLock.current) return

    syncLock.current = true
    setSyncing(true)
    try {
      const rows = await api.exportScheduledSends()
      await ensureSheetSetup(token, scheduledSheetsId)
      const result = await syncToSheet(token, scheduledSheetsId, rows)
      setSyncStatus('success')
      if (result.updated > 0 && result.added > 0) {
        setSyncMessage(`${result.added} added, ${result.updated} updated`)
      } else if (result.added > 0) {
        setSyncMessage(`${result.added} added`)
      } else if (result.updated > 0) {
        setSyncMessage(`${result.updated} updated`)
      } else {
        setSyncMessage('Up to date')
      }
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (err) {
      setSyncStatus('error')
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed')
      setTimeout(() => setSyncStatus('idle'), 3000)
    } finally {
      syncLock.current = false
      setSyncing(false)
    }
  }, [scheduledSheetsId, token])

  function startEdit(item: ScheduledSend) {
    const { subject, body } = parseEmailDraft(item.draft)
    setEditSubject(subject)
    setEditBody(body)
    const date = new Date(item.sendAt)
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    setEditSendAt(local.toISOString().slice(0, 16))
    setEditingId(item.id)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditSubject('')
    setEditBody('')
    setEditSendAt('')
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    try {
      const draft = buildDraft(editSubject, editBody)
      const sendAt = new Date(editSendAt).toISOString()
      await onUpdate(editingId, { draft, sendAt })
      cancelEdit()
      if (scheduledSheetsId && token) {
        await syncToGoogleSheet()
      }
    } finally {
      setSaving(false)
    }
  }

  function handleSaveSheet() {
    const extracted = extractSpreadsheetId(sheetInput)
    if (extracted) {
      onSheetsIdChange(extracted)
      setShowSetup(false)
      setSheetInput('')
    }
  }


  if (pending.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-1">No scheduled sends</h3>
        <p className="text-sm text-slate-500">Schedule emails from the Outreach or Staging page</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {pending.length} Scheduled Email{pending.length !== 1 ? 's' : ''}
          </h2>
          <p className="text-sm text-slate-500">Edit emails and they'll sync to your Google Sheet</p>
        </div>
        <div className="flex items-center gap-3">
          {scheduledSheetsId ? (
            <button
              type="button"
              onClick={syncToGoogleSheet}
              disabled={syncing || !token}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Syncing...' : syncStatus === 'success' ? syncMessage : syncStatus === 'error' ? syncMessage : 'Sync to Sheet'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Setup Google Sheet
            </button>
          )}
        </div>
      </div>

      {showSetup && (
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <p className="text-sm text-slate-700 mb-3">
            Link your Google Sheet to auto-sync scheduled emails:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="Paste Google Sheet URL..."
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
            <button
              type="button"
              onClick={handleSaveSheet}
              disabled={!sheetInput.trim()}
              className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setShowSetup(false); setSheetInput('') }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {pending.map((item) => {
          const contact = contacts.find((c) => c.id === item.contactId)
          const { subject, body } = parseEmailDraft(item.draft)
          const isEditing = editingId === item.id

          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                    {contact?.name?.charAt(0) ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{contact?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">
                      {contact?.email} · {contact?.company}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    item.type === 'initial'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {item.type === 'initial' ? 'First email' : 'Follow-up'}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-violet-50 text-violet-700">
                    {formatScheduledAt(item.sendAt)}
                  </span>
                </div>
              </div>

              {isEditing ? (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Send at</label>
                    <input
                      type="datetime-local"
                      value={editSendAt}
                      onChange={(e) => setEditSendAt(e.target.value)}
                      className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save & Sync'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="font-medium text-slate-800 mb-2">{subject}</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">{body}</p>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => onCancel(item.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Cancel send
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
