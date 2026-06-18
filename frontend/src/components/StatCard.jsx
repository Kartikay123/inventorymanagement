const GRADIENTS = {
  brand: 'from-brand-500 to-brand-700',
  emerald: 'from-emerald-500 to-emerald-700',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-rose-700',
  sky: 'from-sky-500 to-blue-700',
}

export default function StatCard({ label, value, icon: Icon, tone = 'brand', hint }) {
  return (
    <div className="card group relative overflow-hidden p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p>}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${
            GRADIENTS[tone] || GRADIENTS.brand
          } text-white shadow-lg`}
        >
          {Icon && <Icon className="h-6 w-6" />}
        </div>
      </div>
    </div>
  )
}
