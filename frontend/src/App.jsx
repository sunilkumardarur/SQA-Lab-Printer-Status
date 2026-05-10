import { useEffect, useState } from 'react'
import { RefreshCw, Plus, Wifi, Bell, Trash2 } from 'lucide-react'
import { usePrinters } from './hooks/usePrinters'
import { useNotifications } from './hooks/useNotifications'
import PrinterTable from './components/PrinterTable'
import AddPrinterModal from './components/AddPrinterModal'
import DeletePrinterModal from './components/DeletePrinterModal'
import NotificationsPanel from './components/NotificationsPanel'
import ClearAllModal from './components/ClearAllModal'
import { clearAllPrinters } from './api/printers'
import clsx from 'clsx'

export default function App() {
  const {
    printers, loading, refreshingAll, refreshing, error,
    load, add, remove, refresh, refreshAllPrinters, reserve, release,
  } = usePrinters()

  const { notifications, loadNotifications, createNotification, markDone } = useNotifications()

  const [showAdd, setShowAdd] = useState(false)
  const [deletingPrinter, setDeletingPrinter] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showClearAll, setShowClearAll] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { load() }, [load])
  useEffect(() => { loadNotifications() }, [loadNotifications])

  // Poll notifications every 30 seconds
  useEffect(() => {
    const id = setInterval(loadNotifications, 30000)
    return () => clearInterval(id)
  }, [loadNotifications])

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleAdd = async (form) => {
    await add(form)
    notify('Printer added — fetching status in background.')
  }

  const handleRefresh = async (sl_no) => { await refresh(sl_no) }

  const handleRefreshAll = async () => {
    await refreshAllPrinters()
    notify('All printers refreshed.')
  }

  const handleReserve = async (sl_no, user) => {
    await reserve(sl_no, user)
    notify(`Printer reserved by ${user}.`)
  }

  const handleRelease = async (sl_no, user = '', password = '') => {
    await release(sl_no, user, password)
    notify('Printer released.')
  }

  const handlePasswordDelete = async (sl_no, password) => {
    await remove(sl_no, password)
    setDeletingPrinter(null)
    notify('Printer deleted.')
  }

  const handleNotifyDelete = async (printer, requestedBy) => {
    try {
      await createNotification({
        printer_sl_no: printer.sl_no,
        printer_name: printer.name,
        printer_ip: printer.ip_address,
        requested_by: requestedBy,
      })
      setDeletingPrinter(null)
      loadNotifications()
      notify('Delete request sent to Navya.')
    } catch (err) {
      if (err?.response?.status === 409) {
        notify('A delete request is already pending for this printer.', 'error')
      } else {
        notify('Failed to send delete request.', 'error')
      }
    }
  }

  const handleMarkDone = async (notifId, password) => {
    await markDone(notifId, password)
    load()
    loadNotifications()
    notify('Request resolved — printer deleted.')
  }

  const handleClearAll = async (password) => {
    await clearAllPrinters(password)
    setShowClearAll(false)
    load()
    loadNotifications()
    notify('All printers cleared.')
  }

  const pendingCount = notifications.filter(n => n.status === 'pending').length

  const stats = {
    total: printers.length,
    available: printers.filter(p => p.availability === 'Available').length,
    inUse: printers.filter(p => p.availability === 'In Use').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brady-blue shadow-md">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* Left: Brady logo + app title */}
          <div className="flex items-center gap-4">
            <BradyLogo />
            <div className="border-l border-white/30 pl-4">
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">
                SQA Lab Printer Status
              </h1>
              <p className="text-blue-200 text-xs font-medium">Label Printer Monitor</p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={refreshingAll}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition border border-white/20 disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshingAll ? 'animate-spin' : ''} />
              {refreshingAll ? 'Refreshing…' : 'Refresh All'}
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-brady-blue rounded-lg text-sm font-semibold hover:bg-blue-50 transition"
            >
              <Plus size={14} /> Add Printer
            </button>

            <button
              onClick={() => setShowClearAll(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition border border-red-700"
              title="Admin only — clear all printers"
            >
              <Trash2 size={14} /> Clear All
            </button>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition border border-white/20"
              title="Delete Requests"
            >
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-2.5 flex items-center gap-6">
          <Stat label="Total" value={stats.total} color="text-gray-700" />
          <Stat label="Available" value={stats.available} color="text-emerald-600" />
          <Stat label="In Use" value={stats.inUse} color="text-orange-500" />
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <Wifi size={13} />
            {loading ? 'Loading…' : `${stats.total} printer${stats.total !== 1 ? 's' : ''} monitored`}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32 text-gray-400">
            <RefreshCw size={24} className="animate-spin mr-3" />
            <span className="text-lg">Loading printers…</span>
          </div>
        ) : (
          <PrinterTable
            printers={printers}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onRequestDelete={setDeletingPrinter}
            onReserve={handleReserve}
            onRelease={handleRelease}
          />
        )}
      </main>

      {/* Modals & panels */}
      {showAdd && (
        <AddPrinterModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {deletingPrinter && (
        <DeletePrinterModal
          printer={deletingPrinter}
          onPasswordDelete={handlePasswordDelete}
          onNotifyDelete={handleNotifyDelete}
          onClose={() => setDeletingPrinter(null)}
        />
      )}
      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onMarkDone={handleMarkDone}
          onClose={() => setShowNotifications(false)}
        />
      )}
      {showClearAll && (
        <ClearAllModal
          onConfirm={handleClearAll}
          onClose={() => setShowClearAll(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function BradyLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-white rounded-lg px-2 py-1 shadow-sm">
        <img src="/brady_logo.png" alt="Brady Corporation" className="h-8 w-auto object-contain" />
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('text-xl font-bold', color)}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
