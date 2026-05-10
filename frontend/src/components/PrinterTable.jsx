import { useState } from 'react'
import { RefreshCw, Trash2, Lock, Unlock } from 'lucide-react'
import StatusBadge from './StatusBadge'
import AvailabilityBadge from './AvailabilityBadge'
import ReserveModal from './ReserveModal'
import ReleaseModal from './ReleaseModal'
import clsx from 'clsx'

const COLS = [
  { label: '#',            cls: 'w-[3%]' },
  { label: 'Model',        cls: 'w-[5%]' },
  { label: 'Serial',       cls: 'w-[10%]' },
  { label: 'IP Address',   cls: 'w-[8%]' },
  { label: 'Location',     cls: 'w-[7%]' },
  { label: 'Label',        cls: 'w-[11%]' },
  { label: 'Ribbon',       cls: 'w-[9%]' },
  { label: 'Status',       cls: 'w-[9%]' },
  { label: 'Availability', cls: 'w-[9%]' },
  { label: 'Reserved By',  cls: 'w-[9%]' },
  { label: 'Updated',      cls: 'w-[7%]' },
  { label: 'Actions',      cls: 'w-[9%]' },
]

function fmtDate(val) {
  if (!val) return null
  // "2026-05-09 23:01:51" → "May 9\n23:01"
  const d = new Date(val.replace(' ', 'T'))
  if (isNaN(d)) return val
  const mon = d.toLocaleString('en', { month: 'short' })
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${mon} ${day}, ${hh}:${mm}`
}

export default function PrinterTable({ printers, refreshing, onRefresh, onRequestDelete, onReserve, onRelease }) {
  const [reserving, setReserving] = useState(null)
  const [releasing, setReleasing] = useState(null)

  const canReserve = p =>
    p.availability === 'Available' && p.status !== 'Unreachable' && p.availability !== 'Not Available'

  if (printers.length === 0) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="text-5xl mb-4">🖨️</p>
        <p className="text-lg font-medium">No printers added yet</p>
        <p className="text-sm mt-1">Click <strong>Add Printer</strong> to get started.</p>
      </div>
    )
  }

  return (
    <>
      {reserving && (
        <ReserveModal
          printer={reserving}
          onReserve={onReserve}
          onClose={() => setReserving(null)}
        />
      )}
      {releasing && (
        <ReleaseModal
          printer={releasing}
          onRelease={onRelease}
          onClose={() => setReleasing(null)}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-brady-blue text-white text-left">
              {COLS.map(c => (
                <th key={c.label} className={clsx('px-3 py-3 font-semibold whitespace-nowrap text-xs uppercase tracking-wide', c.cls)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {printers.map((p, i) => {
              const isRefreshing = refreshing[p.sl_no]
              const inUse = p.availability === 'In Use'

              return (
                <tr
                  key={p.sl_no}
                  className={clsx(
                    'transition-colors group',
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60',
                    'hover:bg-brady-light'
                  )}
                >
                  <td className="px-3 py-3 text-gray-400 font-mono text-xs truncate">{p.sl_no}</td>
                  <td className="px-3 py-3 font-semibold text-gray-900 truncate">{p.name || <span className="text-gray-300 font-normal">—</span>}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-600 truncate">{p.serial_number || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-700 truncate">{p.ip_address}</td>
                  <td className="px-3 py-3 truncate">
                    {p.location ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {p.location}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-700">{p.label || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3 text-xs text-gray-700 truncate">{p.ribbon || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3" title={p.status}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-3 truncate">
                    <AvailabilityBadge availability={p.availability} />
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs truncate">{p.reserved_by || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs leading-tight">
                    {p.last_updated ? fmtDate(p.last_updated) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap items-center gap-0.5">
                      {/* Refresh */}
                      <button
                        onClick={() => onRefresh(p.sl_no)}
                        disabled={isRefreshing}
                        title="Refresh status"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brady-blue hover:bg-brady-light transition disabled:opacity-40"
                      >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                      </button>

                      {/* Reserve / Release */}
                      {inUse ? (
                        <button
                          onClick={() => setReleasing(p)}
                          title="Release reservation"
                          className="p-1.5 rounded-lg text-orange-400 hover:text-orange-600 hover:bg-orange-50 transition"
                        >
                          <Unlock size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => canReserve(p) && setReserving(p)}
                          disabled={!canReserve(p)}
                          title={canReserve(p) ? 'Reserve printer' : 'Cannot reserve — printer unreachable'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Lock size={14} />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => onRequestDelete(p)}
                        title="Delete printer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
