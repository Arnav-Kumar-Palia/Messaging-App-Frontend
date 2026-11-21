// Shapes returned by the MessagingApp REST API. Timestamps are ISO-8601 UTC strings.

export interface User {
  id: number
  /** Always lower case, e.g. "bob@example.com". */
  email: string
  /** Chosen at sign-up, 1 to 50 characters; always set. */
  displayName: string
}

export interface Contact {
  userId: number
  email: string
  displayName: string
  addedAt: string
}

export interface Message {
  id: number
  senderId: number
  receiverId: number
  content: string
  sentAt: string
  /** True once the receiver has opened the chat. */
  read: boolean
  readAt: string | null
}

export interface Conversation {
  /** The other person in the chat. */
  user: User
  /** Newest message in either direction. */
  lastMessage: Message
  /** Messages from them you have not read yet. */
  unreadCount: number
}

/** Returned by both register and login. */
export interface AuthResponse {
  token: string
  expiresAt: string
  user: User
}

export interface MarkReadResponse {
  markedAsRead: number
}

/** Body of every error response (application/problem+json). */
export interface ProblemDetail {
  title?: string
  status?: number
  detail?: string
}
