import clsx from 'clsx'

export default function AvailabilityBadge({ availability }) {
  const inUse    = availability === 'In Use'
  const notAvail = availability === 'Not Available'
  return (
    <span className={clsx(
      'avail-badge',
      inUse    ? 'avail-inuse' :
      notAvail ? 'avail-unavailable' :
                 'avail-available'
    )}>
      {inUse ? '🔒 In Use' : notAvail ? '✕ Not Available' : '✓ Available'}
    </span>
  )
}
