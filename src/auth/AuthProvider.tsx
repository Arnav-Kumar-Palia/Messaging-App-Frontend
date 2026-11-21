import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, errorMessage, setAuthToken, setUnauthorizedHandler } from '../api/client'
import { api } from '../api/endpoints'
import type { AuthResponse, User } from '../api/types'
import { AuthContext, type AuthContextValue, type AuthState } from './authContext'
import { clearToken, loadToken, saveToken } from './tokenStorage'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    loadToken() ? { status: 'loading' } : { status: 'signedOut', sessionExpired: false },
  )
  const [attempt, setAttempt] = useState(0)

  const expireSession = useCallback(() => {
    clearToken()
    setAuthToken(null)
    setState({ status: 'signedOut', sessionExpired: true })
  }, [])

  // Any request rejected for its token sends the user back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(expireSession)
    return () => setUnauthorizedHandler(null)
  }, [expireSession])

  // On start (and on retry after a network failure), check the stored token still works.
  useEffect(() => {
    const token = loadToken()
    if (!token) return
    setAuthToken(token)
    let cancelled = false
    api.getMe().then(
      (user) => {
        if (!cancelled) setState({ status: 'signedIn', user, token })
      },
      (error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) expireSession()
        else setState({ status: 'offline', message: errorMessage(error) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt, expireSession])

  const login = useCallback((result: AuthResponse) => {
    saveToken(result.token)
    setAuthToken(result.token)
    setState({ status: 'signedIn', user: result.user, token: result.token })
  }, [])

  const logout = useCallback(async () => {
    // The request captures the token as it starts, so the session can be dropped
    // locally right away. Leaving the app also closes the live socket before the
    // server's "logged out" close arrives, so it isn't mistaken for an expired session.
    const request = api.logout()
    clearToken()
    setAuthToken(null)
    setState({ status: 'signedOut', sessionExpired: false })
    try {
      await request
    } catch {
      // The token is already discarded locally.
    }
  }, [])

  const updateUser = useCallback((user: User) => {
    setState((s) => (s.status === 'signedIn' ? { ...s, user } : s))
  }, [])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, logout, expireSession, updateUser, retry }),
    [state, login, logout, expireSession, updateUser, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
