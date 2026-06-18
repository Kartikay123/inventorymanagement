const TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20',
}

export default function Badge({ tone = 'slate', children, className = '' }) {
  return <span className={`badge ${TONES[tone] || TONES.slate} ${className}`}>{children}</span>
}
