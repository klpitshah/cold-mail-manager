import { useState } from 'react'
import {
  defaultScheduleInputValue,
  minScheduleInputValue,
  parseDatetimeLocalValue,
} from '../utils/scheduleDate'

type SendConfirmVariant = 'primary' | 'warning'

interface SendConfirmDialogProps {
  title: string
  message: string
  sendLabel?: string
  scheduleLabel?: string
  variant?: SendConfirmVariant
  loading?: boolean
  onSendNow: () => void
  onSchedule: (sendAt: string) => void
  onCancel: () => void
}

const sendButtonStyles: Record<SendConfirmVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700',
  warning: 'bg-amber-500 hover:bg-amber-600',
}

export function SendConfirmDialog({
  title,
  message,
  sendLabel = 'Send now',
  scheduleLabel = 'Schedule send',
  variant = 'primary',
  loading = false,
  onSendNow,
  onSchedule,
  onCancel,
}: SendConfirmDialogProps) {
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [sendAt, setSendAt] = useState(defaultScheduleInputValue)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  function handleSchedule() {
    const parsed = parseDatetimeLocalValue(sendAt)
    if (!parsed) {
      setScheduleError('Pick a valid date and time')
      return
    }
    if (parsed.getTime() <= Date.now()) {
      setScheduleError('Scheduled time must be in the future')
      return
    }
    setScheduleError(null)
    onSchedule(parsed.toISOString())
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-confirm-title"
      >
        <div className="px-6 py-5">
          <h2 id="send-confirm-title" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('now')
                setScheduleError(null)
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition ${
                mode === 'now'
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Send now
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('schedule')
                setScheduleError(null)
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition ${
                mode === 'schedule'
                  ? 'border-violet-300 bg-violet-50 text-violet-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Schedule
            </button>
          </div>

          {mode === 'schedule' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Send at</label>
              <input
                type="datetime-local"
                value={sendAt}
                min={minScheduleInputValue()}
                onChange={(e) => {
                  setSendAt(e.target.value)
                  setScheduleError(null)
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
              />
              {scheduleError && <p className="text-xs text-red-600 mt-1">{scheduleError}</p>}
              <p className="text-xs text-slate-500 mt-1">
                Keep this app open with Gmail connected when the send time arrives.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition disabled:opacity-60"
          >
            Cancel
          </button>
          {mode === 'now' ? (
            <button
              type="button"
              onClick={onSendNow}
              disabled={loading}
              className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition shadow-sm disabled:opacity-60 ${sendButtonStyles[variant]}`}
            >
              {loading ? 'Working…' : sendLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSchedule}
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition shadow-sm disabled:opacity-60"
            >
              {loading ? 'Working…' : scheduleLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
