import { useEffect, useState } from 'react'
import type { User } from '../api/types'
import { useInbox } from '../hooks/useInbox'
import { contactToUser } from '../utils/format'
import { ChatWindow } from './ChatWindow'
import { ChatBubbleIcon } from './Icons'
import { Sidebar } from './Sidebar'

const APP_TITLE = 'MessagingApp'

export function ChatLayout({ me }: { me: User }) {
  const inbox = useInbox(me)
  const [activePeer, setActivePeer] = useState<User | null>(null)
  const activeId = activePeer?.id ?? null

  // Prefer the freshest copy of the open chat's user (they may have changed their name).
  const conversationUser = inbox.conversations?.find((c) => c.user.id === activeId)?.user
  const contact = inbox.contacts?.find((c) => c.userId === activeId)
  const peer = conversationUser ?? (contact ? contactToUser(contact) : activePeer)
  const isContact = inbox.contacts === null ? null : contact !== undefined

  // Includes the open chat: its count clears as soon as the messages are marked
  // read, but stays up (in the tab title) while the tab is in the background.
  const unreadTotal = inbox.conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0

  useEffect(() => {
    document.title = unreadTotal > 0 ? `(${unreadTotal}) ${APP_TITLE}` : APP_TITLE
  }, [unreadTotal])

  return (
    <div className={peer ? 'app-shell has-active-chat' : 'app-shell'}>
      <Sidebar
        me={me}
        inbox={inbox}
        activePeerId={activeId}
        unreadTotal={unreadTotal}
        onOpenChat={setActivePeer}
      />
      <main className="chat-pane">
        {peer ? (
          <ChatWindow
            key={peer.id}
            me={me}
            peer={peer}
            isContact={isContact}
            onBack={() => setActivePeer(null)}
            onRead={inbox.clearUnread}
            onSent={inbox.applyMessage}
            onAddContact={inbox.addContact}
          />
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <ChatBubbleIcon size={56} strokeWidth={1.5} />
            </div>
            <h2>{APP_TITLE} for web</h2>
            <p>Pick a chat on the left, or start a new one by searching for an email address.</p>
          </div>
        )}
      </main>
    </div>
  )
}
