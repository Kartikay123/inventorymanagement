import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { ProductsAPI, extractErrorMessage } from '../api/client.js'
import PageHeader from '../components/PageHeader.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorState from '../components/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Badge from '../components/Badge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ProductFormModal from '../components/products/ProductFormModal.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency, formatNumber, stockStatus } from '../utils/format.js'

const THRESHOLD = 10

export default function Products() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProducts(await ProductsAPI.list())
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
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    )
  }, [products, search])

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    try {
      await ProductsAPI.remove(deleting.id)
      toast.success('Product deleted')
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
        title="Products"
        subtitle="Manage your catalog and stock levels."
        actions={
          <button className="btn-primary" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Product
          </button>
        }
      />

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-slate-500">
            {formatNumber(filtered.length)} of {formatNumber(products.length)} products
          </p>
        </div>

        {loading ? (
          <Spinner label="Loading products…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product to start tracking inventory."
            action={
              <button className="btn-primary" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Product
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matches" description={`Nothing matches “${search}”.`} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">SKU</th>
                    <th className="px-5 py-3 text-right font-semibold">Price</th>
                    <th className="px-5 py-3 text-right font-semibold">Stock</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const status = stockStatus(p.quantity, THRESHOLD)
                    return (
                      <tr key={p.id} className="group transition hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-800">{p.name}</p>
                          {p.description && (
                            <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-slate-400">
                              {p.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                            {p.sku}
                          </code>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                          {formatCurrency(p.price)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                          {formatNumber(p.quantity)}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(p)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label={`Delete ${p.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {filtered.map((p) => {
                const status = stockStatus(p.quantity, THRESHOLD)
                return (
                  <li key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <code className="text-xs text-slate-400">SKU {p.sku}</code>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold text-slate-800">{formatCurrency(p.price)}</span>
                        <span className="text-slate-500">{formatNumber(p.quantity)} in stock</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete product"
        message={
          deleting
            ? `Delete “${deleting.name}” (SKU ${deleting.sku})? This cannot be undone. Products that are part of existing orders can’t be deleted.`
            : ''
        }
        confirmLabel="Delete product"
      />
    </div>
  )
}
