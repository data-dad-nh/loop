// Thin sync layer used by AppDataContext when Firebase is configured.
// Strategy: localStorage is always the source of truth for instant reads/
// writes (so the UI never waits on a network round trip). When Firebase is
// enabled, every write is also pushed to Firestore, and a live listener
// merges in changes from other devices (last-write-wins via `updatedAt`).
import {
  collection,
  deleteDoc as fsDeleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase'

export function subscribeCollection(name, onChange) {
  if (!firebaseEnabled) return () => {}
  const ref = collection(db, name)
  return onSnapshot(
    ref,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data())
      onChange(items)
    },
    (err) => console.warn(`Firestore sync (${name}) paused:`, err.message)
  )
}

export function upsertDoc(name, item) {
  if (!firebaseEnabled) return
  const ref = doc(db, name, item.id)
  setDoc(ref, { ...item, updatedAt: Date.now() }).catch((err) =>
    console.warn(`Firestore write (${name}) failed:`, err.message)
  )
}

export function removeDoc(name, id) {
  if (!firebaseEnabled) return
  fsDeleteDoc(doc(db, name, id)).catch((err) =>
    console.warn(`Firestore delete (${name}) failed:`, err.message)
  )
}

// Merge remote snapshot into local list: remote wins per-id when its
// updatedAt is newer (or local has no timestamp yet).
export function mergeByUpdatedAt(local, remote) {
  const byId = new Map(local.map((item) => [item.id, item]))
  for (const r of remote) {
    const l = byId.get(r.id)
    if (!l || (r.updatedAt ?? 0) >= (l.updatedAt ?? 0)) {
      byId.set(r.id, r)
    }
  }
  return Array.from(byId.values())
}
