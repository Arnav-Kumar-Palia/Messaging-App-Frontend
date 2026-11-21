import { request } from './client'
import type { AuthResponse, Contact, Conversation, MarkReadResponse, Message, User } from './types'

export const api = {
  // Auth
  register: (email: string, password: string, displayName: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
      auth: false,
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  // Users
  getMe: () => request<User>('/api/users/me'),
  updateMe: (displayName: string) =>
    request<User>('/api/users/me', { method: 'PATCH', body: { displayName } }),
  /** Exact, case-insensitive email match; 404 if nobody has signed up with it. */
  searchUser: (email: string) =>
    request<User>(`/api/users/search?email=${encodeURIComponent(email)}`),

  // Contacts
  getContacts: () => request<Contact[]>('/api/contacts'),
  addContact: (email: string) =>
    request<Contact>('/api/contacts', { method: 'POST', body: { email } }),
  removeContact: (userId: number) =>
    request<void>(`/api/contacts/${userId}`, { method: 'DELETE' }),

  // Messages
  sendMessage: (receiverId: number, content: string) =>
    request<Message>('/api/messages', { method: 'POST', body: { receiverId, content } }),
  getMessage: (messageId: number) => request<Message>(`/api/messages/${messageId}`),
  getConversations: () => request<Conversation[]>('/api/conversations'),
  /** Full history with one user, oldest first. Does not mark anything read. */
  getConversation: (userId: number) => request<Message[]>(`/api/conversations/${userId}`),
  markConversationRead: (userId: number) =>
    request<MarkReadResponse>(`/api/conversations/${userId}/read`, { method: 'POST' }),
}
