import { useState } from 'react'
import { errorMessage } from '../api/client'
import type { Contact, User } from '../api/types'
import { useAuth } from '../auth/useAuth'
import type { Inbox } from '../hooks/useInbox'
import { useRealtimeStatus } from '../realtime/useRealtime'
import { displayNameOf } from '../utils/format'
import { Avatar } from './Avatar'
import { ContactList } from './ContactList'
import { ConversationList } from './ConversationList'
import { IconButton } from './IconButton'
import { LogOutIcon, NewChatIcon, SearchIcon } from './Icons'
import { NewChatPanel } from './NewChatPanel'
import { ProfilePanel } from './ProfilePanel'

type Tab = 'chats' | 'contacts'
type Panel = 'none' | 'newChat' | 'profile'

interface SidebarProps {
  me: User
  inbox: Inbox
  activePeerId: number | null
  unreadTotal: number
  onOpenChat: (user: User) => void
}

export function Sidebar({ me, inbox, activePeerId, unreadTotal, onOpenChat }: SidebarProps) {
  const { logout } = useAuth()
  const realtimeStatus = useRealtimeStatus()
  const [tab, setTab] = useState<Tab>('chats')
  const [panel, setPanel] = useState<Panel>('none')
  const [filter, setFilter] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  function openChat(user: User) {
    setPanel('none')
    onOpenChat(user)
  }

  function confirmLogout() {
    if (window.confirm('Log out of this device?')) void logout()
  }

  async function removeContact(contact: Contact) {
    const name = displayNameOf(contact)
    if (!window.confirm(`Remove ${name} from your contacts? Your chat history is kept.`)) return
    setActionError(null)
    try {
      await inbox.removeContact(contact.userId)
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const banner =
    actionError ??
    (realtimeStatus === 'reconnecting'
      ? 'Connection lost. Reconnecting… New messages may be delayed.'
      : inbox.error)

  return (
    <aside className="sidebar">
      <header className="pane-header">
        <button
          type="button"
          className="avatar-btn"
          onClick={() => setPanel('profile')}
          aria-label="Your profile"
          title="Your profile"
        >
          <Avatar user={me} />
        </button>
        <h1 className="sidebar-title">Chats</h1>
        <div className="header-actions">
          <IconButton label="New chat" onClick={() => setPanel('newChat')}>
            <NewChatIcon />
          </IconButton>
          <IconButton label="Log out" onClick={confirmLogout}>
            <LogOutIcon size={22} />
          </IconButton>
        </div>
      </header>

      <div className="sidebar-tools">
        <label className="search-box">
          <SearchIcon size={18} />
          <input
            type="search"
            placeholder={tab === 'chats' ? 'Search chats' : 'Search contacts'}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={tab === 'chats' ? 'Search chats' : 'Search contacts'}
          />
        </label>
        <div className="tabs" role="tablist" aria-label="Lists">
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === 'chats'}
            onClick={() => setTab('chats')}
          >
            Chats
            {unreadTotal > 0 && <span className="tab-count">{unreadTotal}</span>}
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === 'contacts'}
            onClick={() => setTab('contacts')}
          >
            Contacts
            {inbox.contacts && inbox.contacts.length > 0 && (
              <span className="tab-count tab-count--muted">{inbox.contacts.length}</span>
            )}
          </button>
        </div>
      </div>

      {banner && (
        <p className="banner banner--warn sidebar-banner" role="status">
          {banner}
        </p>
      )}

      <div className="sidebar-list" role="tabpanel">
        {tab === 'chats' ? (
          <ConversationList
            me={me}
            conversations={inbox.conversations}
            activePeerId={activePeerId}
            filter={filter}
            onOpen={openChat}
            onNewChat={() => setPanel('newChat')}
          />
        ) : (
          <ContactList
            contacts={inbox.contacts}
            activePeerId={activePeerId}
            filter={filter}
            onOpen={openChat}
            onRemove={removeContact}
            onAdd={() => setPanel('newChat')}
          />
        )}
      </div>

      {panel === 'newChat' && (
        <NewChatPanel
          me={me}
          contacts={inbox.contacts}
          onClose={() => setPanel('none')}
          onOpenChat={openChat}
          onAddContact={inbox.addContact}
        />
      )}
      {panel === 'profile' && (
        <ProfilePanel me={me} onClose={() => setPanel('none')} onLogout={confirmLogout} />
      )}
    </aside>
  )
}
