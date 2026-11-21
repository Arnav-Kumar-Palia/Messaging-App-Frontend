import type { ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name, also shown as a tooltip. */
  label: string
}

export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={className ? `icon-btn ${className}` : 'icon-btn'}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}
