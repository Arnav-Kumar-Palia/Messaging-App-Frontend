import type { Contact, User } from '../api/types'

type Person = Pick<User, 'displayName' | 'email'>

/** The name to show for someone (falls back to their email if the name is blank). */
export function displayNameOf(person: Person): string {
  return person.displayName.trim() || person.email
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase()
}

export function contactToUser(contact: Contact): User {
  return { id: contact.userId, email: contact.email, displayName: contact.displayName }
}

/** Case-insensitive match on name or email. */
export function matchesQuery(person: Person, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return person.displayName.toLowerCase().includes(q) || person.email.toLowerCase().includes(q)
}

// ---- Validation (light client-side checks; the server has the final say) ----

export const MAX_EMAIL_LENGTH = 254
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 64
export const MAX_NAME_LENGTH = 50

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns an error message, or null if the email looks valid. */
export function checkEmail(raw: string): string | null {
  const value = raw.trim()
  if (!value) return 'Enter an email address.'
  if (value.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(value)) {
    return 'Enter a valid email address, e.g. alice@example.com'
  }
  return null
}

/** Returns an error message, or null if the password meets the length rules. */
export function checkPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`
  }
  return null
}

const AVATAR_COLORS = [
  '#c2185b',
  '#2e7d32',
  '#1565c0',
  '#6a1b9a',
  '#ad5000',
  '#00796b',
  '#c62828',
  '#4527a0',
]

export function avatarColorFor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]
}

// ---- Dates and times (server sends UTC; everything is shown in local time) ----

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const shortDateFormat = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
})
const fullFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

const DAY_MS = 86_400_000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whole calendar days between `date` and today (0 = today). */
function daysAgo(date: Date): number {
  return Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY_MS)
}

/** "14:05" — shown on every message bubble. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** "21 Nov 2026, 14:05" — for tooltips. */
export function formatFullTimestamp(iso: string): string {
  return fullFormat.format(new Date(iso))
}

/** A key that is equal for two timestamps on the same local calendar day. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** "Today", "Yesterday", "Monday", or "3 Nov 2026" — for date separators in a chat. */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso)
  const diff = daysAgo(date)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return weekdayFormat.format(date)
  return dateFormat.format(date)
}

/** "14:05", "Yesterday", "Monday", or "03/11/26" — for the chat list. */
export function formatListTime(iso: string): string {
  const date = new Date(iso)
  const diff = daysAgo(date)
  if (diff === 0) return timeFormat.format(date)
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return weekdayFormat.format(date)
  return shortDateFormat.format(date)
}
