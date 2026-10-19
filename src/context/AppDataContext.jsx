import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { firebaseEnabled } from '../firebase'
import { mergeByUpdatedAt, subscribeCollection, upsertDoc } from '../firestoreSync'
import { makeId } from '../utils/id'
import { nextDueDate } from '../utils/recurrence'

const AppDataContext = createContext(null)

function useSyncedList(storageKey, firestoreName) {
  const [all, setAll] = useLocalStorage(storageKey, [])
  // The ref is the working copy. Reading it (instead of React state inside a
  // functional updater) means every change is computed and pushed to Firestore
  // synchronously, never "later, if React gets around to running the updater".
  const ref = useRef(all)

  function commit(next) {
    ref.current = next
    setAll(next)
  }

  useEffect(() => {
    if (!firebaseEnabled) return
    return subscribeCollection(firestoreName, (remote) => {
      const { merged, changed, toPush } = mergeByUpdatedAt(ref.current, remote)
      if (changed) commit(merged)
      toPush.forEach((item) => upsertDoc(firestoreName, item))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function add(partial) {
    const item = { id: makeId(), createdAt: new Date().toISOString(), updatedAt: Date.now(), ...partial }
    commit([item, ...ref.current])
    upsertDoc(firestoreName, item)
    return item
  }

  function update(id, patch) {
    const existing = ref.current.find((i) => i.id === id)
    if (!existing) return
    const updated = { ...existing, ...patch, updatedAt: Date.now() }
    commit(ref.current.map((i) => (i.id === id ? updated : i)))
    upsertDoc(firestoreName, updated)
  }

  // With sync on, a delete is a "tombstone": the item is marked deleted and
  // that mark syncs like any other edit, so other devices drop it too.
  // (Removing the cloud copy instead would look, to other devices, like an
  // item they should keep.) Without sync there is nothing to tell, so it's a
  // plain removal.
  function remove(id) {
    const existing = ref.current.find((i) => i.id === id)
    if (!existing) return
    if (!firebaseEnabled) {
      commit(ref.current.filter((i) => i.id !== id))
      return
    }
    const tombstone = { ...existing, deleted: true, updatedAt: Date.now() }
    commit(ref.current.map((i) => (i.id === id ? tombstone : i)))
    upsertDoc(firestoreName, tombstone)
  }

  // Reads the working copy, including items marked deleted.
  function get(id) {
    return ref.current.find((i) => i.id === id)
  }

  const visible = useMemo(() => all.filter((i) => !i.deleted), [all])
  return [visible, { add, update, remove, get }]
}

export function AppDataProvider({ children }) {
  const [tasks, taskOps] = useSyncedList('loop.tasks', 'tasks')
  const [commLog, commOps] = useSyncedList('loop.commLog', 'commLog')
  const [people, peopleOps] = useSyncedList('loop.people', 'people')
  const [procedures, procedureOps] = useSyncedList('loop.procedures', 'procedures')

  function findOrCreatePerson(name) {
    const trimmed = name.trim()
    if (!trimmed) return null
    const existing = people.find((p) => p.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    return peopleOps.add({ name: trimmed })
  }

  // Finishing (or skipping) a task. For a repeating task this also creates the
  // next occurrence. Its id comes from the series and occurrence number, so two
  // devices finishing the same occurrence create the same item, and the normal
  // sync merge leaves one copy instead of two.
  function completeTask(id, { skipped = false } = {}) {
    const task = taskOps.get(id)
    if (!task || task.deleted || task.completed) return
    taskOps.update(id, { completed: true, completedAt: new Date().toISOString(), skipped })
    if (!task.repeat) return

    const seriesId = task.seriesId ?? task.id
    const occurrence = (task.occurrence ?? 0) + 1
    const nextId = `${seriesId}-${occurrence}`
    if (taskOps.get(nextId)) return // another device already made it

    taskOps.add({
      id: nextId,
      title: task.title,
      notes: task.notes ?? '',
      dueAt: nextDueDate(task).toISOString(),
      estimatedMinutes: task.estimatedMinutes ?? null,
      completed: false,
      completedAt: null,
      skipped: false,
      linkedPersonId: task.linkedPersonId ?? null,
      // same steps, all unchecked again
      steps: (task.steps ?? []).map((s, i) => ({ id: `${nextId}-s${i}`, text: s.text, done: false })),
      repeat: task.repeat,
      seriesId,
      occurrence,
    })
  }

  const value = {
    tasks,
    completeTask,
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

    procedures,
    addProcedure: procedureOps.add,
    updateProcedure: procedureOps.update,
    removeProcedure: procedureOps.remove,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
