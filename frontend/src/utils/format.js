// Small formatting helpers shared across pages.

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

export const formatCurrency = (value) => currency.format(Number(value || 0))

export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0))

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Classify a product's stock level for badge styling.
 * `threshold` comes from the backend dashboard (LOW_STOCK_THRESHOLD).
 */
export function stockStatus(quantity, threshold = 10) {
  if (quantity <= 0) return { label: 'Out of stock', tone: 'rose' }
  if (quantity <= threshold) return { label: 'Low stock', tone: 'amber' }
  return { label: 'In stock', tone: 'emerald' }
}

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
