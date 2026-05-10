import { CheckCircle2, AlertCircle, AlertTriangle, WifiOff, Clock, PauseCircle, XCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const STATUS_CONFIG = {
  Ready:            { icon: CheckCircle2, style: 'status-ready' },
  Paused:           { icon: PauseCircle,  style: 'status-warning' },
  'Label Out':      { icon: AlertCircle,  style: 'status-error' },
  'Ribbon Out':     { icon: AlertCircle,  style: 'status-error' },
  'Head Open':      { icon: AlertCircle,  style: 'status-error' },
  'USB Unavailable':{ icon: AlertTriangle,style: 'status-mismatch' },
  'Wiper Open':     { icon: AlertTriangle,style: 'status-mismatch' },
  Unreachable:      { icon: WifiOff,      style: 'status-error' },
  Timeout:          { icon: Clock,        style: 'status-error' },
  Error:            { icon: XCircle,      style: 'status-error' },
  Pending:          { icon: Loader2,      style: 'status-pending' },
}

const DEFAULT = { icon: AlertCircle, style: 'status-warning' }

export default function StatusBadge({ status }) {
  const { icon: Icon, style } = STATUS_CONFIG[status] ?? DEFAULT
  const isPending = status === 'Pending'

  return (
    <span className={clsx('status-badge', style)}>
      <Icon size={13} className={clsx('mt-px mr-1 shrink-0', isPending && 'animate-spin')} />
      {status}
    </span>
  )
}
