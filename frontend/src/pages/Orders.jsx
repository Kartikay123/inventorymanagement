import { useCallback, useEffect, useState } from 'react'
import { ShoppingCart, Plus, Eye, Trash2 } from 'lucide-react'
import { OrdersAPI, extractErrorMessage } from '../api/client.js'
import PageHeader from '../components/PageHeader.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorState from '../components/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Badge from '../components/Badge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import OrderFormModal from '../components/orders/OrderFormModal.jsx'
import OrderDetailsModal from '../components/orders/OrderDetailsModal.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency, formatNumber, formatDate, initialsOf } from '../utils/format.js'

export default function Orders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOrders(await OrdersAPI.list())
    } catch (e) {
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = async () => {
    try {
      await OrdersAPI.remove(deleting.id)
      toast.success('Order cancelled — stock restored')
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
        title="Orders"
        subtitle="Create orders and review past purchases."
        actions={
          <button className="btn-primary" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Create Order
          </button>
        }
      />

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner label="Loading orders…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="Create your first order to see it here. Stock is reduced automatically."
            action={
              <button className="btn-primary" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> Create Order
              </button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 text-center font-semibold">Items</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800">#{o.id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                            {initialsOf(o.customer?.full_name || '?')}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">
                              {o.customer?.full_name || 'Unknown'}
                            </p>
                            <p className="truncate text-xs text-slate-400">{o.customer?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge tone="slate">{formatNumber(o.items.length)}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(o.created_at)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewing(o)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                            aria-label={`View order ${o.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(o)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Cancel order ${o.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {orders.map((o) => (
                <li key={o.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {initialsOf(o.customer?.full_name || '?')}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          #{o.id} · {o.customer?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatNumber(o.items.length)} item{o.items.length !== 1 ? 's' : ''} ·{' '}
                          {formatDate(o.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(o.total_amount)}</span>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setViewing(o)}>
                      <Eye className="h-3.5 w-3.5" /> Details
                    </button>
                    <button className="btn-ghost px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50" onClick={() => setDeleting(o)}>
                      <Trash2 className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <OrderFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
      <OrderDetailsModal open={Boolean(viewing)} onClose={() => setViewing(null)} order={viewing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Cancel order"
        message={
          deleting
            ? `Cancel order #${deleting.id} for ${formatCurrency(deleting.total_amount)}? The reserved stock will be returned to inventory.`
            : ''
        }
        confirmLabel="Cancel order"
      />
    </div>
  )
}
