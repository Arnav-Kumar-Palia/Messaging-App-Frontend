const TOKEN_KEY = 'messaging-app:token'

// Storage can throw (private mode, blocked site data); treat that as "no token".

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // The session still works for this tab; it just won't survive a reload.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing stored, nothing to clear.
  }
}
