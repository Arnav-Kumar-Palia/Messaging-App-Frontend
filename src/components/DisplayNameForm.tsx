import { useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import type { User } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { MAX_NAME_LENGTH } from '../utils/format'

interface DisplayNameFormProps {
  initialName: string
  submitLabel?: string
  onSaved?: (user: User) => void
  autoFocus?: boolean
}

export function DisplayNameForm({
  initialName,
  submitLabel = 'Save',
  onSaved,
  autoFocus,
}: DisplayNameFormProps) {
  const { updateUser } = useAuth()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const unchanged = name.trim() === initialName.trim()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name cannot be empty.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const user = await api.updateMe(trimmed)
      updateUser(user)
      setName(user.displayName)
      setSaved(true)
      onSaved?.(user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="name-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Your name</span>
        <input
          className="input"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Alice"
          autoComplete="name"
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
          aria-describedby="name-help"
          autoFocus={autoFocus}
        />
      </label>
      <p id="name-help" className="field-help">
        This is the name other people see. {MAX_NAME_LENGTH - name.length} characters left.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {saved && unchanged && <p className="form-success">Name saved.</p>}
      <button type="submit" className="btn btn--primary btn--block" disabled={busy || unchanged}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
