import { useState, type FormEvent } from 'react'
import { ApiError, errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import {
  checkEmail,
  checkPassword,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../utils/format'
import { ChatBubbleIcon } from './Icons'
import { PasswordInput } from './PasswordInput'

type Mode = 'login' | 'register'

/** Log in with email + password, or create an account (which also logs you in). */
export function AuthScreen({ sessionExpired }: { sessionExpired: boolean }) {
  const { login } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setEmailTaken(false)
    setConfirm('')
  }

  function validate(): string | null {
    if (isRegister && !name.trim()) return 'Enter your name.'
    const emailProblem = checkEmail(email)
    if (emailProblem) return emailProblem
    if (!isRegister) return password ? null : 'Enter your password.'
    const passwordProblem = checkPassword(password)
    if (passwordProblem) return passwordProblem
    if (password !== confirm) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    setEmailTaken(false)
    try {
      // Passwords are sent exactly as typed; spaces can be part of a password.
      const result = isRegister
        ? await api.register(email.trim(), password, name.trim())
        : await api.login(email.trim(), password)
      login(result) // the auth screen unmounts on success
    } catch (err) {
      setError(errorMessage(err))
      setEmailTaken(isRegister && err instanceof ApiError && err.status === 409)
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <ChatBubbleIcon size={34} />
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h1>{isRegister ? 'Create your account' : 'Log in'}</h1>
          <p className="auth-subtitle">
            {isRegister
              ? 'Sign up with your email to start messaging.'
              : 'Welcome back. Log in with your email and password.'}
          </p>
          {sessionExpired && !isRegister && (
            <p className="banner banner--info">Your session has ended. Please log in again.</p>
          )}

          {isRegister && (
            <label className="field">
              <span className="field-label">Your name</span>
              <input
                className="input"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="name"
                placeholder="e.g. Alice"
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>
          )}
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              inputMode="email"
              autoComplete={isRegister ? 'email' : 'username'}
              autoCapitalize="none"
              spellCheck={false}
              maxLength={MAX_EMAIL_LENGTH}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={!isRegister}
            />
          </label>
          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            help={
              isRegister
                ? `${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`
                : undefined
            }
          />
          {isRegister && (
            <PasswordInput
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
              {emailTaken && (
                <>
                  {' '}
                  <button type="button" className="link-btn" onClick={() => switchMode('login')}>
                    Log in instead
                  </button>
                </>
              )}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy
              ? isRegister
                ? 'Creating account…'
                : 'Logging in…'
              : isRegister
                ? 'Create account'
                : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
          >
            {isRegister ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  )
}
