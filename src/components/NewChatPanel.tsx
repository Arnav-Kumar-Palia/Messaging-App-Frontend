import { useState, type FormEvent } from 'react'
import { ApiError, errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import type { Contact, User } from '../api/types'
import { checkEmail, displayNameOf, MAX_EMAIL_LENGTH } from '../utils/format'
import { Avatar } from './Avatar'
import { IconButton } from './IconButton'
import { ArrowLeftIcon, CheckIcon, UserPlusIcon } from './Icons'

interface NewChatPanelProps {
  me: User
  contacts: Contact[] | null
  onClose: () => void
  onOpenChat: (user: User) => void
  onAddContact: (email: string) => Promise<Contact>
}

/** Find a registered user by email, then message them or add them as a contact. */
export function NewChatPanel({ me, contacts, onClose, onOpenChat, onAddContact }: NewChatPanelProps) {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)

  const isMe = result?.id === me.id
  const isContact = result !== null && (contacts?.some((c) => c.userId === result.id) ?? false)

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResult(null)
    const problem = checkEmail(email)
    if (problem) {
      setError(problem)
      return
    }
    setSearching(true)
    setError(null)
    try {
      setResult(await api.searchUser(email.trim()))
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? `${err.message} Ask them to sign up, then search again.`
          : errorMessage(err),
      )
    } finally {
      setSearching(false)
    }
  }

  async function handleAdd() {
    if (!result) return
    setAdding(true)
    setError(null)
    try {
      await onAddContact(result.email)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  return (
    <section className="side-panel" aria-labelledby="new-chat-title">
      <header className="side-panel-header">
        <IconButton label="Back" onClick={onClose}>
          <ArrowLeftIcon />
        </IconButton>
        <h2 id="new-chat-title">New chat</h2>
      </header>
      <div className="side-panel-body">
        <form className="search-form" onSubmit={handleSearch} noValidate>
          <label className="field">
            <span className="field-label">Find someone by email</span>
            <span className="input-row">
              <input
                className="input"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={MAX_EMAIL_LENGTH}
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby="search-help"
                autoFocus
              />
              <button type="submit" className="btn btn--primary" disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </span>
          </label>
          <p id="search-help" className="field-help">
            Enter their full email address. You can message anyone who has signed up, whether
            or not they&apos;re in your contacts.
          </p>
        </form>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {result && (
          <div className="user-card">
            <Avatar user={result} size={56} />
            <div className="user-card-text">
              <div className="user-card-name">{displayNameOf(result)}</div>
              <div className="user-card-email">{result.email}</div>
            </div>
            {isMe ? (
              <p className="user-card-note">That&apos;s your own account.</p>
            ) : (
              <div className="user-card-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={() => onOpenChat(result)}
                >
                  Message
                </button>
                {isContact ? (
                  <span className="pill">
                    <CheckIcon size={16} /> In your contacts
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={handleAdd}
                    disabled={adding || contacts === null}
                  >
                    <UserPlusIcon size={16} />
                    {adding ? 'Adding…' : 'Add to contacts'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
