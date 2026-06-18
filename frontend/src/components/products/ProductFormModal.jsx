import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '../Modal.jsx'
import { ProductsAPI, extractErrorMessage } from '../../api/client.js'
import { useToast } from '../../context/ToastContext.jsx'

const EMPTY = { name: '', sku: '', price: '', quantity: '', description: '' }

export default function ProductFormModal({ open, onClose, product, onSaved }) {
  const toast = useToast()
  const isEdit = Boolean(product)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name ?? '',
              sku: product.sku ?? '',
              price: String(product.price ?? ''),
              quantity: String(product.quantity ?? ''),
              description: product.description ?? '',
            }
          : EMPTY,
      )
      setErrors({})
    }
  }, [open, product])

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required'
    if (!form.sku.trim()) e.sku = 'SKU is required'
    if (form.price === '' || Number.isNaN(Number(form.price))) e.price = 'Enter a valid price'
    else if (Number(form.price) < 0) e.price = 'Price cannot be negative'
    if (form.quantity === '' || !Number.isInteger(Number(form.quantity)))
      e.quantity = 'Enter a whole number'
    else if (Number(form.quantity) < 0) e.quantity = 'Quantity cannot be negative'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
      description: form.description.trim() || null,
    }
    try {
      setSaving(true)
      if (isEdit) {
        await ProductsAPI.update(product.id, payload)
        toast.success('Product updated')
      } else {
        await ProductsAPI.create(payload)
        toast.success('Product created')
      }
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
      title={isEdit ? 'Edit Product' : 'Add Product'}
      description={isEdit ? `Update “${product?.name}”` : 'Create a new product in your catalog.'}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="p-name">Product name</label>
          <input
            id="p-name"
            className={`input ${errors.name ? 'input-error' : ''}`}
            value={form.name}
            onChange={setField('name')}
            placeholder="e.g. Wireless Mouse"
            autoFocus
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div>
          <label className="label" htmlFor="p-sku">SKU / Code</label>
          <input
            id="p-sku"
            className={`input ${errors.sku ? 'input-error' : ''}`}
            value={form.sku}
            onChange={setField('sku')}
            placeholder="e.g. WM-001"
          />
          {errors.sku && <p className="field-error">{errors.sku}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="p-price">Price (USD)</label>
            <input
              id="p-price"
              type="number"
              step="0.01"
              min="0"
              className={`input ${errors.price ? 'input-error' : ''}`}
              value={form.price}
              onChange={setField('price')}
              placeholder="0.00"
            />
            {errors.price && <p className="field-error">{errors.price}</p>}
          </div>
          <div>
            <label className="label" htmlFor="p-qty">Quantity in stock</label>
            <input
              id="p-qty"
              type="number"
              step="1"
              min="0"
              className={`input ${errors.quantity ? 'input-error' : ''}`}
              value={form.quantity}
              onChange={setField('quantity')}
              placeholder="0"
            />
            {errors.quantity && <p className="field-error">{errors.quantity}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="p-desc">Description <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea
            id="p-desc"
            rows={3}
            className="input resize-none"
            value={form.description}
            onChange={setField('description')}
            placeholder="Short description…"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
