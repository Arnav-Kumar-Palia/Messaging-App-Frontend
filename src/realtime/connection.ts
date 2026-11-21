import { API_BASE_URL } from '../api/client'
import type { Message } from '../api/types'

/** Frames the server pushes. Each is sent only after the change is saved. */
export type ServerEvent =
  | { type: 'message.new'; message: Message }
  | {
      type: 'messages.read'
      readerId: number
      senderId: number
      messageIds: number[]
      readAt: string
    }

/** What the app sees: server events, plus a local signal after every (re)connect. */
export type RealtimeEvent = ServerEvent | { type: 'connected' }

/** "connecting" only before the first connection; "reconnecting" after any drop. */
export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting'

/** Close code the server sends when this token was logged out. */
const CLOSE_LOGGED_OUT = 4001
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 30_000]
const PING_INTERVAL_MS = 30_000
/** No pong this long after a ping means the connection silently died. */
const PONG_TIMEOUT_MS = 10_000

/** `ws(s)://<api>/ws?token=…`. Browsers can't set headers on a WebSocket, so the token goes in the URL. */
export function realtimeUrl(token: string): string {
  const url = new URL(`${API_BASE_URL}/ws`, window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('token', token)
  return url.toString()
}

interface ConnectOptions {
  url: string
  onEvent: (event: RealtimeEvent) => void
  onStatus: (status: ConnectionStatus) => void
  /** Closed with 4001: the token is no longer valid. */
  onLoggedOut: () => void
  /**
   * The socket closed before it ever opened. Browsers hide the reason, so it may
   * be a rejected token (HTTP 401) or just the server being down.
   */
  onRefused: () => void
}

function isServerEvent(data: unknown): data is ServerEvent {
  const type = (data as { type?: unknown } | null)?.type
  return type === 'message.new' || type === 'messages.read'
}

function detach(ws: WebSocket) {
  ws.onopen = null
  ws.onmessage = null
  ws.onclose = null
}

/** Close without the browser warning about closing a socket that is still connecting. */
function closeQuietly(ws: WebSocket) {
  if (ws.readyState === WebSocket.CONNECTING) ws.onopen = () => ws.close(1000)
  else if (ws.readyState === WebSocket.OPEN) ws.close(1000)
}

/**
 * Opens the live-updates socket and keeps it open (pinging every 30 s and
 * reconnecting after 1, 2, 5, then every 30 s) until the returned function is called.
 */
export function connectRealtime(options: ConnectOptions): () => void {
  let socket: WebSocket | null = null
  let failures = 0
  let stopped = false
  let reconnectTimer: number | undefined
  let pingTimer: number | undefined
  let pongTimer: number | undefined

  function stopHeartbeat() {
    window.clearInterval(pingTimer)
    window.clearTimeout(pongTimer)
  }

  function open() {
    if (stopped) return
    const ws = new WebSocket(options.url)
    socket = ws
    let opened = false
    let finished = false

    const finish = (code: number) => {
      if (finished) return
      finished = true
      stopHeartbeat()
      detach(ws)
      if (socket === ws) socket = null
      if (stopped) return
      if (code === CLOSE_LOGGED_OUT) {
        options.onLoggedOut()
        return
      }
      if (!opened) options.onRefused()
      options.onStatus('reconnecting')
      const delay = RECONNECT_DELAYS_MS[Math.min(failures, RECONNECT_DELAYS_MS.length - 1)]
      failures += 1
      reconnectTimer = window.setTimeout(open, delay)
    }

    ws.onopen = () => {
      opened = true
      failures = 0
      options.onStatus('open')
      pingTimer = window.setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return
        ws.send(JSON.stringify({ type: 'ping' }))
        window.clearTimeout(pongTimer)
        pongTimer = window.setTimeout(() => {
          closeQuietly(ws)
          finish(1006)
        }, PONG_TIMEOUT_MS)
      }, PING_INTERVAL_MS)
      // Anything sent while we were disconnected is picked up by a reload on this signal.
      options.onEvent({ type: 'connected' })
    }

    ws.onmessage = (event) => {
      let data: unknown
      try {
        data = JSON.parse(String(event.data))
      } catch {
        return
      }
      if ((data as { type?: unknown } | null)?.type === 'pong') {
        window.clearTimeout(pongTimer)
        return
      }
      if (isServerEvent(data)) options.onEvent(data)
    }

    ws.onclose = (event) => finish(event.code)
  }

  // Back online: skip the rest of the backoff wait.
  function reconnectNow() {
    if (stopped || socket) return
    window.clearTimeout(reconnectTimer)
    failures = 0
    open()
  }

  window.addEventListener('online', reconnectNow)
  open()

  return () => {
    stopped = true
    window.clearTimeout(reconnectTimer)
    stopHeartbeat()
    window.removeEventListener('online', reconnectNow)
    if (socket) {
      detach(socket)
      closeQuietly(socket)
      socket = null
    }
  }
}
