import { useState } from 'react'
import { X, Lock } from 'lucide-react'

export default function ReserveModal({ printer, onReserve, onClose }) {
  const [user, setUser] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!user.trim()) { setError('Please enter your name.'); return }
    setLoading(true)
    try {
      await onReserve(printer.sl_no, user.trim())
      onClose()
    } catch (ex) {
      setError(ex.response?.data?.detail ?? 'Failed to reserve printer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-brady-blue px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Lock size={18} /> Reserve Printer
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Reserving <span className="font-semibold text-gray-900">{printer.name}</span>
            {' '}({printer.ip_address})
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
            <input
              autoFocus
              type="text" value={user} onChange={e => setUser(e.target.value)}
              placeholder="Enter your name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brady-blue/30 focus:border-brady-blue transition"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 px-4 rounded-lg bg-brady-blue text-white font-medium hover:bg-brady-dark transition disabled:opacity-50">
              {loading ? 'Reserving…' : 'Reserve'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
