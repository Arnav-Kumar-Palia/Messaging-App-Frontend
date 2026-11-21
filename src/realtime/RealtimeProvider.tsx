import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import { connectRealtime, realtimeUrl, type ConnectionStatus } from './connection'
import { RealtimeContext, type RealtimeContextValue, type RealtimeListener } from './realtimeContext'

/** Owns the single live-updates socket for the signed-in user and fans its events out. */
export function RealtimeProvider({ token, children }: { token: string; children: ReactNode }) {
  const { expireSession } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const listeners = useRef(new Set<RealtimeListener>())
  const onLoggedOut = useEffectEvent(() => expireSession())

  useEffect(
    () =>
      connectRealtime({
        url: realtimeUrl(token),
        onStatus: setStatus,
        onEvent: (event) => {
          for (const listener of [...listeners.current]) listener(event)
        },
        onLoggedOut: () => onLoggedOut(),
        // A refused handshake may mean the token is dead. Ask the REST API: a 401
        // there ends the session through the API client; anything else just retries.
        onRefused: () => {
          api.getMe().catch(() => {})
        },
      }),
    [token],
  )

  const subscribe = useCallback((listener: RealtimeListener) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])

  const value = useMemo<RealtimeContextValue>(() => ({ status, subscribe }), [status, subscribe])

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
