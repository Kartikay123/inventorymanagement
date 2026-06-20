import axios from 'axios'

// Base URL: relative "/api" by default (proxied in dev via Vite and in Docker
// via nginx). For split deployments (Vercel + Render) set VITE_API_BASE_URL to
// the full backend URL at build time.
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

// If VITE_API_BASE_URL isn't pointed at the backend (e.g. on a Vercel/Netlify
// deploy), requests fall back to "/api" on the SPA host and the platform's
// catch-all returns index.html with a 200. Detect that and surface a clear
// message instead of letting components crash trying to read JSON off HTML.
api.interceptors.response.use((response) => {
  const contentType = response.headers?.['content-type'] || ''
  const looksLikeHtml =
    typeof response.data === 'string' && response.data.trimStart().startsWith('<')
  if (contentType.includes('text/html') || looksLikeHtml) {
    return Promise.reject(
      new Error('API returned HTML, not JSON — set VITE_API_BASE_URL to your backend URL.'),
    )
  }
  return response
})

/**
 * Turn any axios/backend error into a single human-readable string so the UI
 * can show one consistent, friendly message.
 */
export function extractErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  if (data) {
    // Our validation handler: { detail, errors: [{field, message}] }
    if (Array.isArray(data.errors) && data.errors.length) {
      return data.errors
        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
        .join(' · ')
    }
    if (typeof data.detail === 'string') return data.detail
    // FastAPI's default validation shape: detail = [{loc, msg}]
    if (Array.isArray(data.detail) && data.detail.length) {
      return data.detail.map((d) => d.msg || JSON.stringify(d)).join(' · ')
    }
  }
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Is the backend running?'
  if (error?.message === 'Network Error') {
    return 'Cannot reach the API. Make sure the backend is running and reachable.'
  }
  return error?.message || fallback
}

// Products
export const ProductsAPI = {
  list: (params) => api.get('/products', { params }).then((r) => r.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data),
  create: (payload) => api.post('/products', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/products/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
}

// Customers
export const CustomersAPI = {
  list: (params) => api.get('/customers', { params }).then((r) => r.data),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (payload) => api.post('/customers', payload).then((r) => r.data),
  remove: (id) => api.delete(`/customers/${id}`).then((r) => r.data),
}

// Orders
export const OrdersAPI = {
  list: () => api.get('/orders').then((r) => r.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  create: (payload) => api.post('/orders', payload).then((r) => r.data),
  remove: (id) => api.delete(`/orders/${id}`).then((r) => r.data),
}

// Dashboard
export const DashboardAPI = {
  get: () => api.get('/dashboard').then((r) => r.data),
}

export default api
