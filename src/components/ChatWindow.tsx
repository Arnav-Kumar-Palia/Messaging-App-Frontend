import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from 'react'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import type { Contact, Message, User } from '../api/types'
import { useOnMount } from '../hooks/useOnMount'
import { usePolling } from '../hooks/usePolling'
import { useRealtimeEvent, useRealtimeStatus } from '../realtime/useRealtime'
import { dayKey, displayNameOf, formatDayLabel, formatFullTimestamp } from '../utils/format'
import { Avatar } from './Avatar'
import { IconButton } from './IconButton'
import { ArrowLeftIcon, SendIcon, UserPlusIcon } from './Icons'
import { MessageBubble } from './MessageBubble'

/** Only while the live socket is down. */
const FALLBACK_POLL_MS = 3_000
const MAX_MESSAGE_LENGTH = 4_000
const SHOW_COUNTER_FROM = 3_500
/** How close to the bottom (px) still counts as "at the bottom" for auto-scroll. */
const STICKY_THRESHOLD = 80

/** A message the user sent that the server has not confirmed yet. */
interface PendingMessage {
  tempId: string
  content: string
  createdAt: string
  status: 'sending' | 'failed'
  error?: string
}

type TimelineItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; groupStart: boolean }
  | { kind: 'pending'; key: string; pending: PendingMessage; groupStart: boolean }

// Unsent drafts survive switching between chats (but not a page reload).
const drafts = new Map<number, string>()

function bySentAt(a: Message, b: Message): number {
  return Date.parse(a.sentAt) - Date.parse(b.sentAt) || a.id - b.id
}

/**
 * Union of two message lists by id, oldest first. Messages are never deleted and
 * "read" only goes one way, so merging can't lose anything whichever copy is older:
 * a reload that raced with a live event still keeps that event's message or tick.
 */
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((m) => [m.id, m]))
  for (const m of incoming) {
    const known = byId.get(m.id)
    byId.set(
      m.id,
      known ? { ...m, read: known.read || m.read, readAt: m.readAt ?? known.readAt } : m,
    )
  }
  return [...byId.values()].sort(bySentAt)
}

function buildTimeline(messages: Message[], pending: PendingMessage[], meId: number) {
  const items: TimelineItem[] = []
  let lastDay = ''
  let lastSender: number | null = null

  const startDayIfNeeded = (iso: string) => {
    const key = dayKey(iso)
    if (key === lastDay) return false
    lastDay = key
    items.push({ kind: 'day', key: `day-${key}`, label: formatDayLabel(iso) })
    return true
  }

  for (const message of messages) {
    const newDay = startDayIfNeeded(message.sentAt)
    const groupStart = newDay || message.senderId !== lastSender
    lastSender = message.senderId
    items.push({ kind: 'message', key: `m-${message.id}`, message, groupStart })
  }
  for (const item of pending) {
    const newDay = startDayIfNeeded(item.createdAt)
    const groupStart = newDay || lastSender !== meId
    lastSender = meId
    items.push({ kind: 'pending', key: item.tempId, pending: item, groupStart })
  }
  return items
}

interface ChatWindowProps {
  me: User
  peer: User
  /** Null while the contact list is still loading. */
  isContact: boolean | null
  onBack: () => void
  /** The peer's messages to me were marked read. */
  onRead: (peerId: number) => void
  /** I sent a message (the chat list should show it). */
  onSent: (message: Message) => void
  onAddContact: (email: string) => Promise<Contact>
}

export function ChatWindow({
  me,
  peer,
  isContact,
  onBack,
  onRead,
  onSent,
  onAddContact,
}: ChatWindowProps) {
  const peerId = peer.id
  const status = useRealtimeStatus()
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [pending, setPending] = useState<PendingMessage[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => drafts.get(peerId) ?? '')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottom = useRef(true)
  const fetching = useRef(false)
  /** A reload was asked for while one was in flight; run it again afterwards. */
  const fetchAgain = useRef(false)
  const tempIds = useRef(0)

  /** Load the full history and merge it into what's on screen. */
  async function refresh() {
    if (fetching.current) {
      fetchAgain.current = true
      return
    }
    fetching.current = true
    try {
      let history: Message[] = []
      do {
        fetchAgain.current = false
        history = await api.getConversation(peerId)
        const loaded = history
        setMessages((prev) => mergeMessages(prev ?? [], loaded))
        setLoadError(null)
      } while (fetchAgain.current)
      void markReadIfNeeded(history)
    } catch (err) {
      setLoadError(errorMessage(err))
    } finally {
      fetching.current = false
    }
  }

  /**
   * Opening a chat doesn't mark anything read on the server, so do it whenever
   * unread messages from them are on screen and the tab is actually visible.
   */
  async function markReadIfNeeded(list: Message[]) {
    if (document.visibilityState !== 'visible') return
    if (!list.some((m) => m.senderId === peerId && !m.read)) return
    try {
      await api.markConversationRead(peerId)
      setMessages(
        (prev) =>
          prev?.map((m) => (m.senderId === peerId && !m.read ? { ...m, read: true } : m)) ?? prev,
      )
      onRead(peerId)
    } catch {
      // Not critical: the next incoming message or reload tries again.
    }
  }

  useOnMount(refresh)
  usePolling(refresh, FALLBACK_POLL_MS, status !== 'open')

  // Messages that arrived while the tab was in the background count as read once it's back.
  const markVisibleAsRead = useEffectEvent(() => {
    if (messages) void markReadIfNeeded(messages)
  })
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') markVisibleAsRead()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useRealtimeEvent((event) => {
    if (event.type === 'connected') {
      void refresh() // pick up anything sent while disconnected
      return
    }

    if (event.type === 'message.new') {
      const message = event.message
      const fromPeer = message.senderId === peerId && message.receiverId === me.id
      const toPeer = message.senderId === me.id && message.receiverId === peerId
      if (!fromPeer && !toPeer) return
      setMessages((prev) => mergeMessages(prev ?? [], [message]))
      if (fromPeer) void markReadIfNeeded([message])
      // My own message can arrive here before its POST returns: retire the matching
      // "sending" bubble now so it doesn't show twice.
      if (toPeer) {
        setPending((prev) => {
          const index = prev.findIndex((p) => p.status === 'sending' && p.content === message.content)
          return index === -1 ? prev : [...prev.slice(0, index), ...prev.slice(index + 1)]
        })
      }
      return
    }

    // messages.read: they read mine (ticks), or I read theirs on another device.
    const theyReadMine = event.senderId === me.id && event.readerId === peerId
    const iReadTheirs = event.readerId === me.id && event.senderId === peerId
    if (!theyReadMine && !iReadTheirs) return
    const ids = new Set(event.messageIds)
    setMessages(
      (prev) =>
        prev?.map((m) => (ids.has(m.id) && !m.read ? { ...m, read: true, readAt: event.readAt } : m)) ??
        prev,
    )
  })

  async function deliver(item: PendingMessage) {
    setPending((prev) => [
      ...prev.filter((p) => p.tempId !== item.tempId),
      { ...item, status: 'sending', error: undefined },
    ])
    try {
      const saved = await api.sendMessage(peerId, item.content)
      setMessages((prev) => mergeMessages(prev ?? [], [saved]))
      setPending((prev) => prev.filter((p) => p.tempId !== item.tempId))
      onSent(saved)
    } catch (err) {
      setPending((prev) =>
        prev.map((p) =>
          p.tempId === item.tempId ? { ...p, status: 'failed', error: errorMessage(err) } : p,
        ),
      )
    }
  }

  function updateDraft(value: string) {
    setDraft(value)
    if (value) drafts.set(peerId, value)
    else drafts.delete(peerId)
  }

  function submit() {
    const content = draft.trim()
    if (!content) return
    updateDraft('')
    stickToBottom.current = true
    tempIds.current += 1
    void deliver({
      tempId: `pending-${tempIds.current}`,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    })
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a new line (and never send mid-IME composition).
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_THRESHOLD
  }

  async function addToContacts() {
    setAdding(true)
    setAddError(null)
    try {
      await onAddContact(peer.email)
    } catch (err) {
      setAddError(errorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  // Keep the newest message in view, unless the user has scrolled up to read history.
  const itemCount = (messages?.length ?? 0) + pending.length
  const loaded = messages !== null
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [itemCount, loaded])

  // Grow the input with its content, up to the CSS max-height.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  const timeline = messages ? buildTimeline(messages, pending, me.id) : []
  const name = displayNameOf(peer)

  return (
    <section className="chat" aria-label={`Chat with ${name}`}>
      <header className="pane-header chat-header">
        <IconButton className="back-btn" label="Back to chats" onClick={onBack}>
          <ArrowLeftIcon />
        </IconButton>
        <Avatar user={peer} />
        <div className="chat-header-text">
          <h2 className="chat-header-name">{name}</h2>
          <div className="chat-header-sub">{peer.email}</div>
        </div>
      </header>

      <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
        {isContact === false && (
          <div className="chat-notice">
            <span>{name} is not in your contacts.</span>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={addToContacts}
              disabled={adding}
            >
              <UserPlusIcon size={16} />
              {adding ? 'Adding…' : 'Add to contacts'}
            </button>
            {addError && <span className="form-error">{addError}</span>}
          </div>
        )}

        {loadError && messages !== null && (
          <p className="chat-status chat-status--warn" role="status">
            {loadError} Retrying…
          </p>
        )}

        {messages === null ? (
          loadError ? (
            <div className="chat-placeholder">
              <p>{loadError}</p>
              <button type="button" className="btn btn--secondary btn--small" onClick={refresh}>
                Try again
              </button>
            </div>
          ) : (
            <p className="chat-placeholder">Loading messages…</p>
          )
        ) : timeline.length === 0 ? (
          <p className="chat-placeholder">No messages yet. Say hello to {name}!</p>
        ) : (
          <div className="timeline" role="log" aria-live="polite">
            {timeline.map((item) => {
              if (item.kind === 'day') {
                return (
                  <div key={item.key} className="day-separator">
                    <span>{item.label}</span>
                  </div>
                )
              }
              if (item.kind === 'message') {
                const { message } = item
                const outgoing = message.senderId === me.id
                const title =
                  `Sent ${formatFullTimestamp(message.sentAt)}` +
                  (outgoing
                    ? message.readAt
                      ? `\nRead ${formatFullTimestamp(message.readAt)}`
                      : '\nNot read yet'
                    : '')
                return (
                  <MessageBubble
                    key={item.key}
                    content={message.content}
                    sentAt={message.sentAt}
                    outgoing={outgoing}
                    status={message.read ? 'read' : 'sent'}
                    groupStart={item.groupStart}
                    title={title}
                  />
                )
              }
              const { pending: p } = item
              return (
                <MessageBubble
                  key={item.key}
                  content={p.content}
                  sentAt={p.createdAt}
                  outgoing
                  status={p.status}
                  groupStart={item.groupStart}
                  title={p.status === 'failed' ? p.error : 'Sending…'}
                  footer={
                    p.status === 'failed' && (
                      <div className="bubble-failed">
                        <span>Not sent.</span>
                        <button type="button" className="link-btn" onClick={() => void deliver(p)}>
                          Retry
                        </button>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() =>
                            setPending((prev) => prev.filter((x) => x.tempId !== p.tempId))
                          }
                        >
                          Delete
                        </button>
                      </div>
                    )
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="composer-input">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Type a message"
            aria-label={`Message ${name}`}
            onChange={(e) => updateDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {draft.length >= SHOW_COUNTER_FROM && (
            <span className="char-count" aria-live="polite">
              {MAX_MESSAGE_LENGTH - draft.length}
            </span>
          )}
        </div>
        <button
          type="submit"
          className="send-btn"
          disabled={!draft.trim()}
          aria-label="Send message"
          title="Send (Enter)"
        >
          <SendIcon size={22} />
        </button>
      </form>
    </section>
  )
}
