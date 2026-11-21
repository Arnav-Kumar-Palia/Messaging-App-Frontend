import { createContext } from 'react'
import type { ConnectionStatus, RealtimeEvent } from './connection'

export type RealtimeListener = (event: RealtimeEvent) => void

export interface RealtimeContextValue {
  status: ConnectionStatus
  /** Returns an unsubscribe function. */
  subscribe: (listener: RealtimeListener) => () => void
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null)
