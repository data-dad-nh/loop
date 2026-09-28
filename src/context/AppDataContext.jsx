import { createContext, useContext, useEffect, useRef } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { firebaseEnabled } from '../firebase'
import { mergeByUpdatedAt, removeDoc, subscribeCollection, upsertDoc } from '../firestoreSync'
import { makeId } from '../utils/id'

const AppDataContext = createContext(null)

function useSyncedList(storageKey, firestoreName) {
  const [items, setItems] = useLocalStorage(storageKey, [])
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!firebaseEnabled) return
    const unsubscribe = subscribeCollection(firestoreName, (remote) => {
      setItems((local) => mergeByUpdatedAt(local, remote))
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function add(partial) {
    const item = { id: makeId(), createdAt: new Date().toISOString(), updatedAt: Date.now(), ...partial }
    setItems((list) => [item, ...list])
    upsertDoc(firestoreName, item)
    return item
  }

  function update(id, patch) {
    let updated = null
    setItems((list) =>
      list.map((item) => {
        if (item.id !== id) return item
        updated = { ...item, ...patch, updatedAt: Date.now() }
        return updated
      })
    )
    // upsertDoc needs the merged object; stash it after state settles
    queueMicrotask(() => updated && upsertDoc(firestoreName, updated))
  }

  function remove(id) {
    setItems((list) => list.filter((item) => item.id !== id))
    removeDoc(firestoreName, id)
  }

  return [items, { add, update, remove, setItems }]
}

export function AppDataProvider({ children }) {
  const [tasks, taskOps] = useSyncedList('loop.tasks', 'tasks')
  const [commLog, commOps] = useSyncedList('loop.commLog', 'commLog')
  const [people, peopleOps] = useSyncedList('loop.people', 'people')

  function findOrCreatePerson(name) {
    const trimmed = name.trim()
    if (!trimmed) return null
    const existing = people.find((p) => p.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    return peopleOps.add({ name: trimmed })
  }

  const value = {
    tasks,
    addTask: taskOps.add,
    updateTask: taskOps.update,
    removeTask: taskOps.remove,

    commLog,
    addCommEntry: commOps.add,
    updateCommEntry: commOps.update,
    removeCommEntry: commOps.remove,

    people,
    addPerson: peopleOps.add,
    updatePerson: peopleOps.update,
    removePerson: peopleOps.remove,
    findOrCreatePerson,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
