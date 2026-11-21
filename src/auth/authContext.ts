import { createContext } from 'react'
import type { AuthResponse, User } from '../api/types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'offline'; message: string }
  | { status: 'signedOut'; sessionExpired: boolean }
  | { status: 'signedIn'; user: User; token: string }

export interface AuthContextValue {
  state: AuthState
  /** Start a session from a register or login response. */
  login: (result: AuthResponse) => void
  logout: () => Promise<void>
  /** The token stopped working (expired, or logged out elsewhere): back to login. */
  expireSession: () => void
  updateUser: (user: User) => void
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
