import { useContext, useEffect, useEffectEvent } from 'react'
import type { ConnectionStatus, RealtimeEvent } from './connection'
import { RealtimeContext, type RealtimeContextValue } from './realtimeContext'

function useRealtimeContext(): RealtimeContextValue {
  const value = useContext(RealtimeContext)
  if (!value) throw new Error('Realtime hooks must be used inside <RealtimeProvider>')
  return value
}

export function useRealtimeStatus(): ConnectionStatus {
  return useRealtimeContext().status
}

/** Calls `handler` (always the latest version) for every live event while mounted. */
export function useRealtimeEvent(handler: (event: RealtimeEvent) => void): void {
  const { subscribe } = useRealtimeContext()
  const onEvent = useEffectEvent(handler)
  useEffect(() => subscribe((event) => onEvent(event)), [subscribe])
}
