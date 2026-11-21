import { useEffect, useEffectEvent } from 'react'

/**
 * Runs `callback` every `intervalMs` while `enabled` and the page is visible,
 * and once more as soon as a hidden tab becomes visible again.
 * Used only as a fallback while the live-updates socket is disconnected.
 */
export function usePolling(callback: () => unknown, intervalMs: number, enabled: boolean): void {
  const tick = useEffectEvent(() => {
    void callback()
  })

  useEffect(() => {
    if (!enabled) return
    const runIfVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const id = window.setInterval(runIfVisible, intervalMs)
    document.addEventListener('visibilitychange', runIfVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', runIfVisible)
    }
  }, [intervalMs, enabled])
}
