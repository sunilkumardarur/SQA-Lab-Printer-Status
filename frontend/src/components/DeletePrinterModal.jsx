import { useState } from 'react'
import { X, Trash2, Bell, ShieldCheck } from 'lucide-react'

const TAB_NOTIFY = 'notify'
const TAB_PASSWORD = 'password'

export default function DeletePrinterModal({ printer, onPasswordDelete, onNotifyDelete, onClose }) {
  const [tab, setTab] = useState(TAB_NOTIFY)
  const [password, setPassword] = useState('')
  const [yourName, setYourName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handlePasswordDelete = async e => {
    e.preventDefault()
    if (!password) { setError('Please enter the password.'); return }
    setLoading(true)
    setError('')
    try {
      await onPasswordDelete(printer.sl_no, password)
    } catch (ex) {
      setError(ex.response?.data?.detail ?? 'Incorrect password.')
    } finally {
      setLoading(false)
    }
  }

  const handleNotify = async e => {
    e.preventDefault()
    if (!yourName.trim()) { setError('Please enter your name.'); return }
    setLoading(true)
    setError('')
    try {
      localStorage.setItem('sqalab_username', yourName.trim())
      await onNotifyDelete(printer, yourName.trim())
      setDone(true)
    } catch (ex) {
      setError(ex.response?.data?.detail ?? 'Failed to send notification.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Trash2 size={18} /> Delete Printer
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-5">
            Deleting <span className="font-semibold text-gray-900">{printer.name || printer.ip_address}</span>
            {' '}({printer.ip_address}) requires admin approval.
          </p>

          {/* Tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
            <button
              onClick={() => { setTab(TAB_NOTIFY); setError('') }}
              className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                tab === TAB_NOTIFY
                  ? 'bg-brady-blue text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Bell size={14} /> Notify Navya
            </button>
            <button
              onClick={() => { setTab(TAB_PASSWORD); setError('') }}
              className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition border-l border-gray-200 ${
                tab === TAB_PASSWORD
                  ? 'bg-brady-blue text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ShieldCheck size={14} /> I'm Navya
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {/* Notify tab */}
          {tab === TAB_NOTIFY && (
            done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-gray-800">Request sent!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Navya has been notified and will review the delete request.
                </p>
                <button onClick={onClose} className="mt-4 px-5 py-2 bg-brady-blue text-white rounded-lg text-sm font-medium hover:bg-brady-dark transition">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleNotify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    autoFocus
                    type="text"
                    value={yourName}
                    onChange={e => setYourName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brady-blue/30 focus:border-brady-blue transition"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    A delete request will be created. Navya will see it in the notifications panel and action it.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={onClose}
                    className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-2 px-4 rounded-lg bg-brady-blue text-white font-medium hover:bg-brady-dark transition disabled:opacity-50 text-sm">
                    {loading ? 'Sending…' : 'Send Delete Request'}
                  </button>
                </div>
              </form>
            )
          )}

          {/* Password tab */}
          {tab === TAB_PASSWORD && (
            <form onSubmit={handlePasswordDelete} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
                <input
                  autoFocus
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50 text-sm">
                  {loading ? 'Deleting…' : 'Delete Printer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
