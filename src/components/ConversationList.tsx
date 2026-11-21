import type { Conversation, User } from '../api/types'
import { displayNameOf, formatListTime, matchesQuery } from '../utils/format'
import { Avatar } from './Avatar'
import { Ticks } from './Ticks'

interface ConversationListProps {
  me: User
  conversations: Conversation[] | null
  activePeerId: number | null
  filter: string
  onOpen: (user: User) => void
  onNewChat: () => void
}

export function ConversationList({
  me,
  conversations,
  activePeerId,
  filter,
  onOpen,
  onNewChat,
}: ConversationListProps) {
  if (conversations === null) return <p className="list-empty">Loading chats…</p>

  if (conversations.length === 0) {
    return (
      <div className="list-empty">
        <p>No chats yet.</p>
        <button type="button" className="btn btn--secondary btn--small" onClick={onNewChat}>
          Start a new chat
        </button>
      </div>
    )
  }

  const visible = conversations.filter((c) => matchesQuery(c.user, filter))
  if (visible.length === 0) return <p className="list-empty">No chats match “{filter.trim()}”.</p>

  return (
    <ul className="list">
      {visible.map((conversation) => (
        <ConversationRow
          key={conversation.user.id}
          me={me}
          conversation={conversation}
          active={conversation.user.id === activePeerId}
          onOpen={onOpen}
        />
      ))}
    </ul>
  )
}

interface ConversationRowProps {
  me: User
  conversation: Conversation
  active: boolean
  onOpen: (user: User) => void
}

function ConversationRow({ me, conversation, active, onOpen }: ConversationRowProps) {
  const { user, lastMessage } = conversation
  const mine = lastMessage.senderId === me.id
  // The open chat marks messages read on its own poll; don't flash a badge meanwhile.
  const unread = active ? 0 : conversation.unreadCount

  return (
    <li>
      <button
        type="button"
        className={active ? 'list-row is-active' : 'list-row'}
        onClick={() => onOpen(user)}
        aria-current={active ? 'true' : undefined}
      >
        <Avatar user={user} size={48} />
        <span className="list-row-body">
          <span className="list-row-line">
            <span className="list-row-title">{displayNameOf(user)}</span>
            <time
              className={unread > 0 ? 'list-row-time is-unread' : 'list-row-time'}
              dateTime={lastMessage.sentAt}
            >
              {formatListTime(lastMessage.sentAt)}
            </time>
          </span>
          <span className="list-row-line">
            <span className="list-row-preview">
              {mine && <Ticks status={lastMessage.read ? 'read' : 'sent'} />}
              <span className="list-row-preview-text">{lastMessage.content}</span>
            </span>
            {unread > 0 && (
              <span className="badge" aria-label={`${unread} unread`}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}
