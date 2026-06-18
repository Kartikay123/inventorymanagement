import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Trash2, ShoppingCart } from 'lucide-react'
import Modal from '../Modal.jsx'
import {
  OrdersAPI,
  ProductsAPI,
  CustomersAPI,
  extractErrorMessage,
} from '../../api/client.js'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency } from '../../utils/format.js'

const newLine = () => ({ key: Math.random().toString(36).slice(2), product_id: '', quantity: 1 })

export default function OrderFormModal({ open, onClose, onSaved }) {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [loadingRefs, setLoadingRefs] = useState(false)
  const [refError, setRefError] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCustomerId('')
    setLines([newLine()])
    setErrors({})
    setLoadingRefs(true)
    setRefError('')
    Promise.all([ProductsAPI.list(), CustomersAPI.list()])
      .then(([p, c]) => {
        setProducts(p)
        setCustomers(c)
      })
      .catch((e) => setRefError(extractErrorMessage(e)))
      .finally(() => setLoadingRefs(false))
  }, [open])

  const productById = useMemo(() => {
    const map = {}
    products.forEach((p) => (map[p.id] = p))
    return map
  }, [products])

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = productById[l.product_id]
        const qty = Number(l.quantity) || 0
        return sum + (p ? Number(p.price) * qty : 0)
      }, 0),
    [lines, productById],
  )

  const updateLine = (key, patch) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
    setErrors((e) => ({ ...e, [`line-${key}`]: undefined, items: undefined }))
  }
  const addLine = () => setLines((ls) => [...ls, newLine()])
  const removeLine = (key) => setLines((ls) => (ls.length === 1 ? ls : ls.filter((l) => l.key !== key)))

  const validate = () => {
    const e = {}
    if (!customerId) e.customer = 'Please select a customer'

    const chosen = lines.map((l) => l.product_id).filter(Boolean)
    if (chosen.length === 0) e.items = 'Add at least one product'
    if (new Set(chosen).size !== chosen.length) e.items = 'Each product can only be added once'

    lines.forEach((l) => {
      if (!l.product_id) {
        e[`line-${l.key}`] = 'Select a product'
        return
      }
      const qty = Number(l.quantity)
      if (!Number.isInteger(qty) || qty <= 0) {
        e[`line-${l.key}`] = 'Quantity must be at least 1'
        return
      }
      const p = productById[l.product_id]
      if (p && qty > p.quantity) {
        e[`line-${l.key}`] = `Only ${p.quantity} in stock`
      }
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    try {
      setSaving(true)
      await OrdersAPI.create({
        customer_id: Number(customerId),
        items: lines
          .filter((l) => l.product_id)
          .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
      })
      toast.success('Order created')
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const noProducts = !loadingRefs && products.length === 0
  const noCustomers = !loadingRefs && customers.length === 0

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Create Order"
      description="Select a customer and add the products they’re ordering."
      size="lg"
    >
      {loadingRefs ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading products & customers…
        </div>
      ) : refError ? (
        <p className="py-8 text-center text-sm text-rose-600">{refError}</p>
      ) : noProducts || noCustomers ? (
        <div className="py-8 text-center text-sm text-slate-500">
          You need at least one {noCustomers ? 'customer' : ''}
          {noCustomers && noProducts ? ' and one ' : ''}
          {noProducts ? 'product' : ''} before creating an order.
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {/* Customer */}
          <div>
            <label className="label" htmlFor="o-customer">Customer</label>
            <select
              id="o-customer"
              className={`input ${errors.customer ? 'input-error' : ''}`}
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value)
                setErrors((er) => ({ ...er, customer: undefined }))
              }}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} — {c.email}
                </option>
              ))}
            </select>
            {errors.customer && <p className="field-error">{errors.customer}</p>}
          </div>

          {/* Line items */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label mb-0">Products</span>
              <button type="button" onClick={addLine} className="btn-ghost px-2 py-1 text-xs text-brand-600">
                <Plus className="h-4 w-4" /> Add item
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((l) => {
                const p = productById[l.product_id]
                const lineError = errors[`line-${l.key}`]
                const subtotal = p ? Number(p.price) * (Number(l.quantity) || 0) : 0
                return (
                  <div key={l.key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <select
                          className={`input bg-white ${lineError ? 'input-error' : ''}`}
                          value={l.product_id}
                          onChange={(e) => updateLine(l.key, { product_id: e.target.value })}
                        >
                          <option value="">Select product…</option>
                          {products.map((prod) => (
                            <option key={prod.id} value={prod.id} disabled={prod.quantity <= 0}>
                              {prod.name} ({formatCurrency(prod.price)}) ·{' '}
                              {prod.quantity > 0 ? `${prod.quantity} in stock` : 'out of stock'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className={`input w-20 bg-white text-center ${lineError ? 'input-error' : ''}`}
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                        aria-label="Quantity"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        disabled={lines.length === 1}
                        className="mt-0.5 rounded-lg p-2.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex min-h-[1rem] items-center justify-between px-1">
                      {lineError ? (
                        <span className="text-xs font-medium text-rose-600">{lineError}</span>
                      ) : (
                        <span />
                      )}
                      {p && (
                        <span className="text-xs font-medium text-slate-500">
                          Subtotal: {formatCurrency(subtotal)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {errors.items && <p className="field-error">{errors.items}</p>}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-brand-700">
              <ShoppingCart className="h-4 w-4" /> Order total
            </span>
            <span className="text-xl font-bold text-brand-700">{formatCurrency(total)}</span>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Place order
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
