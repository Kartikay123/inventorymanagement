import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Boxes } from 'lucide-react'
import Sidebar from './Sidebar.jsx'

const TITLES = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/customers': 'Customers',
  '/orders': 'Orders',
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'Inventory'

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">{title}</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
