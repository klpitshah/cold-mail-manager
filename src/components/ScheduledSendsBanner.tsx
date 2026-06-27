import { useRef, useState } from 'react'
import type { Contact, ScheduledSend } from '../types'
import { formatScheduledAt } from '../utils/scheduleDate'
import { api } from '../api/client'
import { syncToSheet, ensureSheetSetup, extractSpreadsheetId } from '../services/sheets'

interface ScheduledSendsBannerProps {
  scheduledSends: ScheduledSend[]
  contacts: Contact[]
  onCancel: (id: string) => void
  token: string | null
  scheduledSheetsId: string
  onSheetsIdChange: (id: string) => void
}

export function ScheduledSendsBanner({
  scheduledSends,
  contacts,
  onCancel,
  token,
  scheduledSheetsId,
  onSheetsIdChange,
}: ScheduledSendsBannerProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error' | 'no-sheet'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [sheetInput, setSheetInput] = useState('')
  const syncLock = useRef(false)

  const pending = scheduledSends.filter((item) => item.status === 'pending')
  if (pending.length === 0) return null

  async function handleSync() {
    if (!scheduledSheetsId) {
      setSyncStatus('no-sheet')
      setShowSetup(true)
      return
    }

    if (!token) {
      setSyncStatus('error')
      setSyncMessage('Connect Gmail first')
      setTimeout(() => setSyncStatus('idle'), 3000)
      return
    }

    if (syncLock.current) return

    syncLock.current = true
    setSyncing(true)
    setSyncStatus('idle')
    try {
      const rows = await api.exportScheduledSends()

      await ensureSheetSetup(token, scheduledSheetsId)
      const result = await syncToSheet(token, scheduledSheetsId, rows)

      if (result.updated > 0 && result.added > 0) {
        setSyncMessage(`${result.added} added, ${result.updated} updated`)
      } else if (result.added > 0) {
        setSyncMessage(`${result.added} added`)
      } else if (result.updated > 0) {
        setSyncMessage(`${result.updated} updated`)
      } else {
        setSyncMessage('Up to date')
      }
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 3000)
    } catch (err) {
      setSyncStatus('error')
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed')
      setTimeout(() => setSyncStatus('idle'), 5000)
    } finally {
      syncLock.current = false
      setSyncing(false)
    }
  }

  function handleSaveSheet() {
    const extracted = extractSpreadsheetId(sheetInput)
    if (extracted) {
      onSheetsIdChange(extracted)
      setShowSetup(false)
      setSheetInput('')
      setSyncStatus('idle')
    }
  }

  return (
    <div className="mb-4 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-violet-900">
          {pending.length} scheduled send{pending.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-3">
          {scheduledSheetsId ? (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="text-xs font-medium text-violet-700 hover:text-violet-900 disabled:opacity-50"
            >
              {syncing
                ? 'Syncing...'
                : syncStatus === 'success'
                  ? syncMessage
                  : syncStatus === 'error'
                    ? syncMessage || 'Failed'
                    : 'Sync to Sheet'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="text-xs font-medium text-violet-700 hover:text-violet-900"
            >
              Setup Google Sheet
            </button>
          )}
        </div>
      </div>

      {showSetup && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-violet-200">
          <p className="text-xs text-slate-600 mb-2">
            Paste your Google Sheet URL or ID to enable auto-sync:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
            <button
              type="button"
              onClick={handleSaveSheet}
              disabled={!sheetInput.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSetup(false)
                setSheetInput('')
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            The script will create a "Scheduled" tab and add headers automatically.
          </p>
        </div>
      )}

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
