import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const TONES = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', bar: 'bg-emerald-500', iconColor: 'text-emerald-500' },
  error: { icon: AlertCircle, ring: 'border-rose-200', bar: 'bg-rose-500', iconColor: 'text-rose-500' },
  info: { icon: Info, ring: 'border-brand-200', bar: 'bg-brand-500', iconColor: 'text-brand-500' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const toast = {
    success: (m, d) => push(m, 'success', d),
    error: (m, d) => push(m, 'error', d ?? 6000),
    info: (m, d) => push(m, 'info', d),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((t) => {
          const tone = TONES[t.type] || TONES.info
          const Icon = tone.icon
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border ${tone.ring} bg-white pl-4 pr-3 py-3 shadow-card-hover animate-slide-in`}
            >
              <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconColor}`} />
              <p className="flex-1 text-sm font-medium leading-snug text-slate-700">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
