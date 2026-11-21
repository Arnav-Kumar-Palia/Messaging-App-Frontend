import type { User } from '../api/types'
import { Avatar } from './Avatar'
import { DisplayNameForm } from './DisplayNameForm'
import { IconButton } from './IconButton'
import { ArrowLeftIcon, LogOutIcon } from './Icons'

interface ProfilePanelProps {
  me: User
  onClose: () => void
  onLogout: () => void
}

export function ProfilePanel({ me, onClose, onLogout }: ProfilePanelProps) {
  return (
    <section className="side-panel" aria-labelledby="profile-title">
      <header className="side-panel-header">
        <IconButton label="Back" onClick={onClose}>
          <ArrowLeftIcon />
        </IconButton>
        <h2 id="profile-title">Profile</h2>
      </header>
      <div className="side-panel-body">
        <div className="profile-avatar">
          <Avatar user={me} size={120} />
        </div>
        <DisplayNameForm initialName={me.displayName} />
        <div className="profile-field">
          <span className="field-label">Email</span>
          <span className="profile-value">{me.email}</span>
        </div>
        <button type="button" className="btn btn--danger btn--block" onClick={onLogout}>
          <LogOutIcon size={18} />
          Log out
        </button>
      </div>
    </section>
  )
}
