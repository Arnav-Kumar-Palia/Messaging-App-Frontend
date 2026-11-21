import type { Contact, User } from '../api/types'
import { contactToUser, displayNameOf, matchesQuery } from '../utils/format'
import { Avatar } from './Avatar'
import { IconButton } from './IconButton'
import { TrashIcon, UserPlusIcon } from './Icons'

interface ContactListProps {
  contacts: Contact[] | null
  activePeerId: number | null
  filter: string
  onOpen: (user: User) => void
  onRemove: (contact: Contact) => void
  onAdd: () => void
}

export function ContactList({
  contacts,
  activePeerId,
  filter,
  onOpen,
  onRemove,
  onAdd,
}: ContactListProps) {
  if (contacts === null) return <p className="list-empty">Loading contacts…</p>

  const visible = [...contacts]
    .filter((c) => matchesQuery(c, filter))
    .sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b)))

  return (
    <>
      <button type="button" className="list-action" onClick={onAdd}>
        <span className="list-action-icon">
          <UserPlusIcon size={22} />
        </span>
        Add a contact
      </button>
      {contacts.length === 0 ? (
        <p className="list-empty">
          No contacts yet. Find people by their email address and add them here.
        </p>
      ) : visible.length === 0 ? (
        <p className="list-empty">No contacts match “{filter.trim()}”.</p>
      ) : (
        <ul className="list">
          {visible.map((contact) => {
            const name = displayNameOf(contact)
            const active = contact.userId === activePeerId
            return (
              <li key={contact.userId} className="contact-item">
                <button
                  type="button"
                  className={active ? 'list-row is-active' : 'list-row'}
                  onClick={() => onOpen(contactToUser(contact))}
                  aria-current={active ? 'true' : undefined}
                >
                  <Avatar user={{ id: contact.userId, displayName: contact.displayName }} size={48} />
                  <span className="list-row-body list-row-body--with-action">
                    <span className="list-row-title">{name}</span>
                    <span className="list-row-preview-text">{contact.email}</span>
                  </span>
                </button>
                <IconButton
                  className="contact-remove"
                  label={`Remove ${name} from contacts`}
                  onClick={() => onRemove(contact)}
                >
                  <TrashIcon size={18} />
                </IconButton>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
