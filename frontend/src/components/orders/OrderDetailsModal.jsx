import { Mail, Phone, Calendar, Hash } from 'lucide-react'
import Modal from '../Modal.jsx'
import Badge from '../Badge.jsx'
import { formatCurrency, formatNumber, formatDate } from '../../utils/format.js'

export default function OrderDetailsModal({ open, onClose, order }) {
  if (!order) return null
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)

  return (
    <Modal open={open} onClose={onClose} title={`Order #${order.id}`} size="lg">
      <div className="space-y-5">
        {/* Summary chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            <Hash className="h-3 w-3" /> Order {order.id}
          </Badge>
          <Badge tone="emerald">{order.status}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" /> {formatDate(order.created_at)}
          </span>
        </div>

        {/* Customer */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
          {order.customer ? (
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">{order.customer.full_name}</p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" /> {order.customer.email}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Customer no longer available</p>
          )}
        </div>

        {/* Items */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Items ({formatNumber(itemCount)})
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Product</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Unit</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Qty</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {item.product?.name || `Product #${item.product_id}`}
                      </p>
                      {item.product?.sku && (
                        <p className="text-xs text-slate-400">SKU {item.product.sku}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-600">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-brand-700">
                    {formatCurrency(order.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
