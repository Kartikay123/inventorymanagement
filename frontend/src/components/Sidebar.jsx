import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, Users, ShoppingCart, Boxes, X } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
]

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-900/40">
        <Boxes className="h-6 w-6 text-white" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-white">Inventory</p>
        <p className="text-xs font-medium text-slate-400">Order Management</p>
      </div>
    </div>
  )
}

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900">
        <Brand />
        <NavItems />
        <div className="px-5 py-4 text-xs text-slate-500">
          <p>v1.0.0 · FastAPI + React</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-slate-900 shadow-2xl transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between">
            <Brand />
            <button
              onClick={onClose}
              className="mr-4 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <NavItems onNavigate={onClose} />
          <div className="px-5 py-4 text-xs text-slate-500">v1.0.0 · FastAPI + React</div>
        </aside>
      </div>
    </>
  )
}
