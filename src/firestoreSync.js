// Thin sync layer used by AppDataContext when Firebase is configured.
// localStorage stays the instant, offline-first copy. Every change is also
// written to Firestore, and a live listener merges in changes made on other
// devices. Conflicts are resolved per item by `updatedAt` (newest wins).
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase'

export function subscribeCollection(name, onChange) {
  if (!firebaseEnabled) return () => {}
  return onSnapshot(
    collection(db, name),
    (snapshot) => onChange(snapshot.docs.map((d) => d.data())),
    (err) => console.warn(`Firestore sync (${name}) paused:`, err.message)
  )
}

// Writes the item exactly as given. `updatedAt` is NOT touched here: it is
// set when the change is made, so every device agrees on which edit is newer.
export function upsertDoc(name, item) {
  if (!firebaseEnabled) return
  // JSON round trip drops `undefined` fields, which Firestore rejects.
  const clean = JSON.parse(JSON.stringify(item))
  setDoc(doc(db, name, item.id), clean).catch((err) =>
    console.warn(`Firestore write (${name}) failed:`, err.message)
  )
}

// Compare the local list with a snapshot of the remote one.
//  - merged:  the combined list (newest version of each item wins)
//  - changed: true if anything in `merged` differs from `local`
//  - toPush:  items where this device has a newer version than the cloud
// Items that exist only locally are left alone and NOT uploaded: absence from
// the cloud can't tell "never uploaded" from "deleted elsewhere", and
// guessing wrong would bring deleted items back from the dead.
// Deletes are synced as tombstones (`deleted: true`), not by removing the doc.
export function mergeByUpdatedAt(local, remote) {
  const byId = new Map(local.map((item) => [item.id, item]))
  const toPush = []
  let changed = false
  for (const r of remote) {
    const l = byId.get(r.id)
    const rTime = r.updatedAt ?? 0
    const lTime = l?.updatedAt ?? 0
    if (!l || rTime > lTime) {
      byId.set(r.id, r)
      changed = true
    } else if (lTime > rTime) {
      toPush.push(l)
    }
  }
  return { merged: Array.from(byId.values()), changed, toPush }
}
