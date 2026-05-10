import { useState } from 'react'
import { X, Plus } from 'lucide-react'

const LOCATIONS = ['Milwaukee', 'Plymouth', 'Singapore']

const EMPTY = { ip_address: '', location: '' }

export default function AddPrinterModal({ onAdd, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const validate = () => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(form.ip_address)) return 'Enter a valid IPv4 address.'
    const parts = form.ip_address.split('.').map(Number)
    if (parts.some(n => n > 255)) return 'Enter a valid IPv4 address.'
    if (!form.location) return 'Please select a location.'
    return ''
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      await onAdd(form)
      onClose()
    } catch (ex) {
      setError(ex.response?.data?.detail ?? 'Failed to add printer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-brady-blue px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Plus size={20} /> Add Printer
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            All printer details (model, serial, label, ribbon, status) are automatically fetched from the printer's IP address.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IP Address *</label>
            <input
              autoFocus
              type="text"
              name="ip_address"
              value={form.ip_address}
              onChange={handleChange}
              placeholder="e.g. 10.244.78.224"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brady-blue/30 focus:border-brady-blue transition font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <select
              name="location"
              value={form.location}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brady-blue/30 focus:border-brady-blue transition bg-white"
            >
              <option value="">Select location…</option>
              {LOCATIONS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 px-4 rounded-lg bg-brady-blue text-white font-medium hover:bg-brady-dark transition disabled:opacity-50 text-sm">
              {loading ? 'Adding…' : 'Add Printer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
