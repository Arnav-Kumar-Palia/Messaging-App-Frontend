import type { ReactNode } from 'react'
import { formatTime } from '../utils/format'
import { Ticks, type DeliveryStatus } from './Ticks'

interface MessageBubbleProps {
  content: string
  sentAt: string
  outgoing: boolean
  /** Shown only on outgoing messages. */
  status?: DeliveryStatus
  /** First bubble in a run from the same sender; gets the little tail. */
  groupStart: boolean
  /** Tooltip on the time, e.g. full sent and read timestamps. */
  title?: string
  footer?: ReactNode
}

export function MessageBubble({
  content,
  sentAt,
  outgoing,
  status,
  groupStart,
  title,
  footer,
}: MessageBubbleProps) {
  const rowClass = [
    'bubble-row',
    outgoing ? 'bubble-row--out' : 'bubble-row--in',
    groupStart ? 'bubble-row--group-start' : '',
  ].join(' ')

  return (
    <div className={rowClass}>
      <div className={groupStart ? 'bubble bubble--tail' : 'bubble'}>
        <span className="bubble-text">{content}</span>
        <span className="bubble-meta" title={title}>
          <time dateTime={sentAt}>{formatTime(sentAt)}</time>
          {outgoing && status && <Ticks status={status} />}
        </span>
      </div>
      {footer}
    </div>
  )
}
