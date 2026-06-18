import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  Boxes,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { DashboardAPI, extractErrorMessage } from '../api/client.js'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorState from '../components/ErrorState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { formatCurrency, formatNumber, formatDate, stockStatus } from '../utils/format.js'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await DashboardAPI.get())
    } catch (e) {
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner label="Loading dashboard…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  const threshold = data.low_stock_threshold

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="A quick overview of your inventory and sales activity."
      />

      {/* Primary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Products" value={formatNumber(data.total_products)} icon={Package} tone="brand" />
        <StatCard label="Total Customers" value={formatNumber(data.total_customers)} icon={Users} tone="sky" />
        <StatCard label="Total Orders" value={formatNumber(data.total_orders)} icon={ShoppingCart} tone="emerald" />
        <StatCard
          label="Low Stock Items"
          value={formatNumber(data.low_stock_count)}
          icon={AlertTriangle}
          tone="amber"
          hint={`${data.out_of_stock_count} out of stock`}
        />
      </div>

      {/* Secondary stats */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Inventory Value"
          value={formatCurrency(data.total_inventory_value)}
          icon={Boxes}
          tone="brand"
          hint="Total value of stock on hand"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.total_revenue)}
          icon={DollarSign}
          tone="emerald"
          hint="Across all confirmed orders"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Low stock */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-slate-900">Low Stock Alerts</h2>
            </div>
            <Link to="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {data.low_stock_products.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              Everything is well stocked. 🎉
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.low_stock_products.map((p) => {
                const status = stockStatus(p.quantity, threshold)
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">SKU {p.sku}</p>
                    </div>
                    <Badge tone={status.tone}>{p.quantity} left</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Recent orders */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-500" />
              <h2 className="font-semibold text-slate-900">Recent Orders</h2>
            </div>
            <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {data.recent_orders.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      #{o.id} · {o.customer?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {o.items.length} item{o.items.length !== 1 ? 's' : ''} · {formatDate(o.created_at)}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900">{formatCurrency(o.total_amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
