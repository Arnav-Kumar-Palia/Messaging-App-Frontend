import './App.css'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import { AuthScreen } from './components/AuthScreen'
import { ChatLayout } from './components/ChatLayout'
import { OfflineScreen, SplashScreen } from './components/StatusScreens'
import { RealtimeProvider } from './realtime/RealtimeProvider'

function Screens() {
  const { state, retry } = useAuth()
  switch (state.status) {
    case 'loading':
      return <SplashScreen />
    case 'offline':
      return <OfflineScreen message={state.message} onRetry={retry} />
    case 'signedOut':
      return <AuthScreen sessionExpired={state.sessionExpired} />
    case 'signedIn':
      return (
        // Keyed by token so a new login always gets a fresh socket.
        <RealtimeProvider key={state.token} token={state.token}>
          <ChatLayout me={state.user} />
        </RealtimeProvider>
      )
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Screens />
    </AuthProvider>
  )
}
