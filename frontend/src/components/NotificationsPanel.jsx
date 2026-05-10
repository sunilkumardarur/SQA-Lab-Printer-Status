import { useState } from 'react'
import { X, Trash2, CheckCircle, Clock, Bell } from 'lucide-react'

export default function NotificationsPanel({ notifications, onMarkDone, onClose }) {
  const pending = notifications.filter(n => n.status === 'pending')

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-brady-blue px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Bell size={18} /> Delete Requests
            {pending.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {pending.length}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <CheckCircle size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No pending requests</p>
              <p className="text-sm mt-1">All delete requests have been resolved.</p>
            </div>
          ) : (
            pending.map(n => (
              <NotificationCard key={n.id} notif={n} onMarkDone={onMarkDone} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationCard({ notif, onMarkDone }) {
  const [password, setPassword] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMarkDone = async () => {
    if (!password) { setError('Password required.'); return }
    setLoading(true)
    setError('')
    try {
      await onMarkDone(notif.id, password)
    } catch (ex) {
      setError(ex.response?.data?.detail ?? 'Incorrect password.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <Trash2 size={13} className="text-red-500" />
            Delete: {notif.printer_name || notif.printer_ip}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">IP: {notif.printer_ip}</p>
        </div>
        <span className="shrink-0 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
          Pending
        </span>
      </div>

      <div className="text-xs text-gray-600 space-y-0.5">
        <p>Requested by: <span className="font-medium text-gray-800">{notif.requested_by}</span></p>
        <p className="flex items-center gap-1 text-gray-400">
          <Clock size={11} /> {notif.requested_at}
        </p>
      </div>

      {/* Action */}
      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="w-full py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition flex items-center justify-center gap-1.5"
        >
          <CheckCircle size={13} /> Mark Done & Delete Printer
        </button>
      ) : (
        <div className="space-y-2">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>
          )}
          <input
            autoFocus
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition"
            onKeyDown={e => e.key === 'Enter' && handleMarkDone()}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowInput(false); setError(''); setPassword('') }}
              className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkDone}
              disabled={loading}
              className="flex-1 py-1.5 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Processing…' : 'Confirm & Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
