import { AlertIcon, ClockIcon } from './Icons'

/**
 * The server only knows "sent" and "read" (there is no "delivered" state).
 * "sending" and "failed" are local states for a message still on its way.
 */
export type DeliveryStatus = 'sending' | 'sent' | 'read' | 'failed'

const LABELS: Record<DeliveryStatus, string> = {
  sending: 'Sending',
  sent: 'Sent',
  read: 'Read',
  failed: 'Not sent',
}

export function Ticks({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`ticks ticks--${status}`} role="img" aria-label={LABELS[status]}>
      {status === 'sending' && <ClockIcon size={13} strokeWidth={2.4} />}
      {status === 'failed' && <AlertIcon size={14} strokeWidth={2.4} />}
      {(status === 'sent' || status === 'read') && (
        <svg
          width="17"
          height="11"
          viewBox="0 0 17 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M1.2 5.8 4.5 9.2 11.2 1.6" />
          {status === 'read' && <path d="m7.9 8.6.6.6 6.7-7.6" />}
        </svg>
      )}
    </span>
  )
}
