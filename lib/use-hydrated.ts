import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// False during server rendering and the first client render, true after.
// Anything built from "today" waits for it, because the server's clock and
// time zone are not the visitor's and the markup would not match.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
