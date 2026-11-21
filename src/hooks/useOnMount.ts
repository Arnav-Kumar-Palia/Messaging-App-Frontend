import { useEffect, useEffectEvent } from 'react'

/** Runs `callback` once when the component mounts (for initial data loads). */
export function useOnMount(callback: () => unknown): void {
  const run = useEffectEvent(() => {
    void callback()
  })
  useEffect(() => {
    run()
  }, [])
}
