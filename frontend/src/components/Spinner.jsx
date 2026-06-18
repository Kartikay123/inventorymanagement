import { Loader2 } from 'lucide-react'

export default function Spinner({ className = '', label }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-slate-400 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  )
}
