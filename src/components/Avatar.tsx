import type { User } from '../api/types'
import { avatarColorFor, initialsOf } from '../utils/format'
import { PersonIcon } from './Icons'

interface AvatarProps {
  user: Pick<User, 'id' | 'displayName'>
  size?: number
}

/** Initials on a colour picked from the user id, or a silhouette if no name is set. */
export function Avatar({ user, size = 40 }: AvatarProps) {
  const name = user.displayName.trim()
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: name ? avatarColorFor(user.id) : undefined,
      }}
    >
      {name ? initialsOf(name) : <PersonIcon size={Math.round(size * 0.62)} />}
    </span>
  )
}
