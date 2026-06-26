type ConfirmVariant = 'danger' | 'primary' | 'warning'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const confirmButtonStyles: Record<ConfirmVariant, string> = {
  danger: 'bg-red-600 hover:bg-red-700',
  primary: 'bg-blue-600 hover:bg-blue-700',
  warning: 'bg-amber-500 hover:bg-amber-600',
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="px-6 py-5">
          <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition shadow-sm disabled:opacity-60 ${confirmButtonStyles[variant]}`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
