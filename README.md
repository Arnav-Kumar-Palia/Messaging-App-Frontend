# MessagingApp — web frontend

A WhatsApp-style messaging client built with React 19, TypeScript and Vite. It talks to the
MessagingApp REST API (default `http://localhost:8080`).

## Features

- **Email + password accounts.** Create an account with your name, email and password
  (8 to 64 characters, entered twice), or log in to an existing one. Both log you straight in.
  Passwords have a show/hide toggle. If you sign up with an email that already has an
  account, the app offers to log in instead.
- **Find people and manage contacts.** Search for any registered user by exact email
  (case-insensitive), then message them or add them to your contacts. Contacts can be
  removed; chat history is kept.
- **Message anyone.** Contacts aren't required. Chats from people who aren't in your contacts
  show up in your inbox with an "Add to contacts" prompt.
- **Timestamps on every message.** Times are shown in local time, with Today / Yesterday /
  date separators. Hover the time to see the full sent and read timestamps.
- **Read receipts.** Your messages show ✓ (sent) or blue ✓✓ (read). Opening a chat marks the
  other person's messages as read.

Also included: unread badges and an unread count in the tab title, light and dark themes, a
phone-friendly single-pane layout, optimistic sending with retry, and drafts kept per chat.

### Live updates

After login the app opens one WebSocket (`/ws?token=…`). The server pushes new messages
(`message.new`) and read receipts (`messages.read`) over it, so chats, badges and ticks
update instantly. Sending a message is still a REST call (`POST /api/messages`).

- **Keep-alive:** the app pings every 30 s. If no pong comes back within 10 s, it treats the
  connection as dead.
- **Reconnects:** if the socket drops, the app reconnects after 1, 2, 5, then every 30 s, and
  straight away when the browser comes back online. A "Reconnecting…" banner shows meanwhile.
  After every (re)connect, it reloads the chat list and the open chat once to pick up anything
  missed.
- **Fallback polling:** while the socket is down, the app polls the chat list every 5 s and the
  open chat every 3 s, and pauses while the tab is hidden.
- **Logged out:** close code `4001`, which comes from logging out elsewhere with the same
  token, returns the app to the login screen. So does a refused handshake confirmed by a 401
  from `GET /api/users/me`.
- **Read receipts:** messages count as read only while the tab is visible. Messages that arrive
  in the background are marked read when you come back.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Start the backend first. In development, Vite proxies `/api/*` and the `/ws` WebSocket to
`http://localhost:8080`, so the browser never makes cross-origin requests.

| Script            | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Dev server with hot reload           |
| `npm run build`   | Type-check and build into `dist/`    |
| `npm run preview` | Serve the production build locally   |
| `npm run lint`    | ESLint                               |

### Configuration

Copy `.env.example` to `.env.local` to override:

- `API_PROXY_TARGET`: where the dev and preview servers forward `/api` and `/ws` (default
  `http://localhost:8080`).
- `VITE_API_BASE_URL`: an absolute API URL baked into the build. Set it when the built app is
  served from a different address than the API. Leave it empty to use the proxy. The socket
  address comes from it too (`https://…` becomes `wss://…/ws`).

## Project layout

```
src/
  api/          types.ts (API shapes), client.ts (fetch wrapper, errors, auth header),
                endpoints.ts (one function per endpoint)
  auth/         AuthProvider (session state, token storage, 401 → log out), useAuth
  realtime/     connection.ts (socket, ping/pong, backoff reconnect), RealtimeProvider,
                useRealtimeEvent / useRealtimeStatus
  hooks/        useInbox (chat list + contacts), usePolling (fallback), useOnMount
  components/   AuthScreen, PasswordInput, ChatLayout, Sidebar, ConversationList,
                ContactList, NewChatPanel, ProfilePanel, ChatWindow, MessageBubble, Ticks, …
  utils/        format.ts (names, email/password checks, date/time formatting)
```

The login token is kept in `localStorage`, and the app checks it with `GET /api/users/me` on
startup. Any request rejected with 401 clears the token and returns you to the login screen.
