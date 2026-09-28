import { useEffect, useState } from 'react'

// Simple persisted-state hook. This is the fallback (and default) store —
// the app is fully usable with zero setup because of this. When Firebase
// is configured (see firebase.js), AppDataContext layers Firestore sync
// on top of the same state.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or unavailable — fail silently, nothing to recover here
    }
  }, [key, value])

  return [value, setValue]
}
