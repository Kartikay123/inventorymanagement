import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users, Plus, Search, Trash2, Mail, Phone, MapPin } from 'lucide-react'
import { CustomersAPI, extractErrorMessage } from '../api/client.js'
import PageHeader from '../components/PageHeader.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorState from '../components/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import CustomerFormModal from '../components/customers/CustomerFormModal.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatNumber, formatDate, initialsOf } from '../utils/format.js'

const AVATAR_TONES = [
  'from-brand-400 to-brand-600',
  'from-emerald-400 to-emerald-600',
  'from-sky-400 to-blue-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-rose-600',
  'from-violet-400 to-violet-600',
]

export default function Customers() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCustomers(await CustomersAPI.list())
    } catch (e) {
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    )
  }, [customers, search])

  const confirmDelete = async () => {
    try {
      await CustomersAPI.remove(deleting.id)
      toast.success('Customer deleted')
      setDeleting(null)
      load()
    } catch (e) {
      toast.error(extractErrorMessage(e))
      setDeleting(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Customers"
        subtitle="Manage the people who place orders."
        actions={
          <button className="btn-primary" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="text-sm text-slate-500">
          {formatNumber(filtered.length)} of {formatNumber(customers.length)} customers
        </p>
      </div>

      {loading ? (
        <div className="card">
          <Spinner label="Loading customers…" />
        </div>
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : customers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer to start creating orders."
            action={
              <button className="btn-primary" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> Add Customer
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Search} title="No matches" description={`Nothing matches “${search}”.`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="card group p-5 transition-shadow hover:shadow-card-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${
                      AVATAR_TONES[c.id % AVATAR_TONES.length]
                    } text-sm font-bold text-white shadow-sm`}
                  >
                    {initialsOf(c.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{c.full_name}</p>
                    <p className="text-xs text-slate-400">Joined {formatDate(c.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleting(c)}
                  className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Delete ${c.full_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{c.email}</span>
                </p>
                <p className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  {c.phone}
                </p>
                {c.address && (
                  <p className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{c.address}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete customer"
        message={
          deleting
            ? `Delete “${deleting.full_name}”? Customers with existing orders can’t be deleted.`
            : ''
        }
        confirmLabel="Delete customer"
      />
    </div>
  )
}
