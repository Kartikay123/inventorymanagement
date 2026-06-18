import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from './Modal.jsx'

/**
 * Confirmation dialog for destructive actions. `onConfirm` may return a promise;
 * the button shows a spinner until it resolves, then the dialog closes.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  tone = 'danger',
}) {
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    try {
      setBusy(true)
      await onConfirm?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="pt-1 text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
          onClick={handleConfirm}
          disabled={busy}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
