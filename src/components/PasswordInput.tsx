import { useId, useState } from 'react'
import { MAX_PASSWORD_LENGTH } from '../utils/format'
import { IconButton } from './IconButton'
import { EyeIcon, EyeOffIcon } from './Icons'

interface PasswordInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  help?: string
}

/** Password field with a show/hide toggle. */
export function PasswordInput({ label, value, onChange, autoComplete, help }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()
  const helpId = useId()

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <span className="password-wrap">
        <input
          id={inputId}
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          maxLength={MAX_PASSWORD_LENGTH}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={help ? helpId : undefined}
        />
        <IconButton
          className="password-toggle"
          label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </IconButton>
      </span>
      {help && (
        <p id={helpId} className="field-help">
          {help}
        </p>
      )}
    </div>
  )
}
