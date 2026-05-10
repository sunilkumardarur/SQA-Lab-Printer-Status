import { useState } from 'react'
import { X, Unlock } from 'lucide-react'

export default function ReleaseModal({ printer, onRelease, onClose }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reservedBy = printer.reserved_by || 'someone'

  const handleSubmit = async e => {
    e.preventDefault()
    if (!name.trim() && !password.trim()) {
      setError('Enter your name or the admin password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onRelease(printer.sl_no, name.trim(), password.trim())
      onClose()
    } catch (ex) {
      const msg = ex.response?.data?.detail ?? 'Could not release printer.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-orange-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Unlock size={18} /> Release Printer
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{printer.name || printer.ip_address}</span>
            {' '}is reserved by{' '}
            <span className="font-semibold text-orange-600">{reservedBy}</span>.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
            Only <strong>{reservedBy}</strong> or an admin can release this printer.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name <span className="text-gray-400 font-normal">(must match reserved person)</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`Enter "${reservedBy}" to release`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 px-4 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition disabled:opacity-50 text-sm">
              {loading ? 'Releasing…' : 'Release Printer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
