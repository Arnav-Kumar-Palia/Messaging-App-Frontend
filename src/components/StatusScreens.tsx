import { ChatBubbleIcon } from './Icons'

export function SplashScreen() {
  return (
    <div className="status-screen" role="status">
      <div className="status-logo">
        <ChatBubbleIcon size={40} />
      </div>
      <p>Loading your chats…</p>
    </div>
  )
}

export function OfflineScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="status-screen">
      <div className="status-logo status-logo--muted">
        <ChatBubbleIcon size={40} />
      </div>
      <h1>Can&apos;t connect</h1>
      <p>{message}</p>
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
