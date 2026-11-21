import { useCallback, useRef, useState } from 'react'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import type { Contact, Conversation, Message, User } from '../api/types'
import type { ServerEvent } from '../realtime/connection'
import { useRealtimeEvent, useRealtimeStatus } from '../realtime/useRealtime'
import { useOnMount } from './useOnMount'
import { usePolling } from './usePolling'

/** Only while the live socket is down. */
const FALLBACK_POLL_MS = 5_000
/** Re-fetches allowed when live updates keep landing during a reload. */
const MAX_RELOAD_ATTEMPTS = 3

type ReadReceipt = Extract<ServerEvent, { type: 'messages.read' }>

export interface Inbox {
  /** Null until the first load finishes. */
  conversations: Conversation[] | null
  contacts: Contact[] | null
  /** Last load error; cleared by the next good load. */
  error: string | null
  /** Show a message in the chat list (moves its chat to the top). Safe to call twice. */
  applyMessage: (message: Message) => void
  /** Clear the unread badge for the chat with this user. */
  clearUnread: (userId: number) => void
  addContact: (email: string) => Promise<Contact>
  removeContact: (userId: number) => Promise<void>
}

/** The signed-in user's chat list and contacts, kept current by live socket events. */
export function useInbox(me: User): Inbox {
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const status = useRealtimeStatus()
  const latestRequest = useRef(0)
  /** Bumped by every live update applied locally. */
  const localChanges = useRef(0)

  const refreshConversations = useCallback(async () => {
    const requestId = ++latestRequest.current
    try {
      for (let attempt = 1; attempt <= MAX_RELOAD_ATTEMPTS; attempt++) {
        const changesAtStart = localChanges.current
        const data = await api.getConversations()
        if (requestId !== latestRequest.current) return
        // A live update landed while this was in flight and may be missing from
        // this snapshot: fetch again rather than undo it.
        if (changesAtStart !== localChanges.current && attempt < MAX_RELOAD_ATTEMPTS) continue
        setConversations(data)
        setError(null)
        return
      }
    } catch (err) {
      if (requestId === latestRequest.current) setError(errorMessage(err))
    }
  }, [])

  const refreshContacts = useCallback(async () => {
    try {
      setContacts(await api.getContacts())
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  function reloadAll() {
    void refreshConversations()
    void refreshContacts()
  }

  useOnMount(reloadAll)
  usePolling(refreshConversations, FALLBACK_POLL_MS, status !== 'open')

  function applyMessage(message: Message) {
    const otherId = message.senderId === me.id ? message.receiverId : message.senderId
    // A brand-new chat (e.g. a first message from a stranger): we don't have
    // that person's profile yet, so load the list.
    if (!conversations?.some((c) => c.user.id === otherId)) {
      void refreshConversations()
      return
    }
    localChanges.current += 1
    setConversations((prev) => {
      if (!prev) return prev
      const index = prev.findIndex((c) => c.user.id === otherId)
      if (index === -1) return prev
      const row = prev[index]
      if (row.lastMessage.id >= message.id) return prev // already shown, or something newer is
      const unreadIncoming = message.receiverId === me.id && !message.read
      const updated: Conversation = {
        ...row,
        lastMessage: message,
        unreadCount: row.unreadCount + (unreadIncoming ? 1 : 0),
      }
      return [updated, ...prev.slice(0, index), ...prev.slice(index + 1)]
    })
  }

  function applyReadReceipt(receipt: ReadReceipt) {
    localChanges.current += 1
    const ids = new Set(receipt.messageIds)
    const markRead = (m: Message): Message =>
      ids.has(m.id) && !m.read ? { ...m, read: true, readAt: receipt.readAt } : m
    setConversations((prev) =>
      prev?.map((c) => {
        // They read my messages: update the preview tick.
        if (receipt.senderId === me.id && c.user.id === receipt.readerId) {
          return { ...c, lastMessage: markRead(c.lastMessage) }
        }
        // I read theirs (on any of my devices): clear the badge.
        if (receipt.readerId === me.id && c.user.id === receipt.senderId) {
          return { ...c, unreadCount: 0, lastMessage: markRead(c.lastMessage) }
        }
        return c
      }) ?? prev,
    )
  }

  function clearUnread(userId: number) {
    localChanges.current += 1
    setConversations(
      (prev) =>
        prev?.map((c) => (c.user.id === userId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c)) ??
        prev,
    )
  }

  useRealtimeEvent((event) => {
    if (event.type === 'connected') reloadAll()
    else if (event.type === 'message.new') applyMessage(event.message)
    else applyReadReceipt(event)
  })

  const addContact = useCallback(async (email: string) => {
    const contact = await api.addContact(email)
    setContacts((prev) => [...(prev ?? []).filter((c) => c.userId !== contact.userId), contact])
    return contact
  }, [])

  const removeContact = useCallback(async (userId: number) => {
    await api.removeContact(userId)
    setContacts((prev) => prev?.filter((c) => c.userId !== userId) ?? prev)
  }, [])

  return { conversations, contacts, error, applyMessage, clearUnread, addContact, removeContact }
}
