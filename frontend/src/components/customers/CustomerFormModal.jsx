import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '../Modal.jsx'
import { CustomersAPI, extractErrorMessage } from '../../api/client.js'
import { useToast } from '../../context/ToastContext.jsx'

const EMPTY = { full_name: '', email: '', phone: '', address: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CustomerFormModal({ open, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setErrors({})
    }
  }, [open])

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    else if (form.phone.trim().length < 3) e.phone = 'Phone number looks too short'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    try {
      setSaving(true)
      await CustomersAPI.create({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
      })
      toast.success('Customer added')
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Add Customer"
      description="Create a new customer record."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="c-name">Full name</label>
          <input
            id="c-name"
            className={`input ${errors.full_name ? 'input-error' : ''}`}
            value={form.full_name}
            onChange={setField('full_name')}
            placeholder="e.g. Alice Johnson"
            autoFocus
          />
          {errors.full_name && <p className="field-error">{errors.full_name}</p>}
        </div>

        <div>
          <label className="label" htmlFor="c-email">Email address</label>
          <input
            id="c-email"
            type="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            value={form.email}
            onChange={setField('email')}
            placeholder="e.g. alice@example.com"
          />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div>
          <label className="label" htmlFor="c-phone">Phone number</label>
          <input
            id="c-phone"
            className={`input ${errors.phone ? 'input-error' : ''}`}
            value={form.phone}
            onChange={setField('phone')}
            placeholder="e.g. +1-202-555-0101"
          />
          {errors.phone && <p className="field-error">{errors.phone}</p>}
        </div>

        <div>
          <label className="label" htmlFor="c-address">
            Address <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="c-address"
            className="input"
            value={form.address}
            onChange={setField('address')}
            placeholder="e.g. 123 Maple St, Springfield"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add customer
          </button>
        </div>
      </form>
    </Modal>
  )
}
