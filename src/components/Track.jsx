import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { relativeFromNow } from '../utils/time'
import TrackerDetail from './TrackerDetail'
import TrackerEditor from './TrackerEditor'

// Things you log over time. Private trackers stay out of sight until you ask
// for them, and the list hides them again whenever you leave this screen.
export default function Track({ openTrackerId, onOpenTracker }) {
  const { trackers, trackerEntries, addTracker } = useAppData()
  const [creating, setCreating] = useState(false)
  const [showPrivate, setShowPrivate] = useState(false)
  const open = trackers.find((t) => t.id === openTrackerId)

  if (creating) {
    return (
      <div className="screen">
        <TrackerEditor
          tracker={null}
          onCancel={() => setCreating(false)}
          onSave={(draft) => {
            const created = addTracker(draft)
            setCreating(false)
            onOpenTracker(created.id)
          }}
        />
      </div>
    )
  }

  if (open) return <TrackerDetail tracker={open} onBack={() => onOpenTracker(null)} />

  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  const normal = trackers.filter((t) => !t.private).sort(byName)
  const hidden = trackers.filter((t) => t.private).sort(byName)

  const row = (t) => {
    const mine = trackerEntries.filter((e) => e.trackerId === t.id)
    const weekAgo = Date.now() - 7 * 86400000
    const lastWeek = mine.filter((e) => new Date(e.at).getTime() >= weekAgo).length
    const last = mine.reduce((m, e) => (new Date(e.at) > m ? new Date(e.at) : m), new Date(0))
    return (
      <li key={t.id}>
        <button className="people-row list-card" onClick={() => onOpenTracker(t.id)}>
          <span className="list-card__main">
            <span className="people-row__name">{t.name}</span>
            <span className="list-card__sub">
              {mine.length === 0 ? 'Nothing logged yet' : `${lastWeek} in the last 7 days · last ${relativeFromNow(last.toISOString())}`}
            </span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="screen">
      <button className="btn btn--primary" style={{ alignSelf: 'flex-start' }} onClick={() => setCreating(true)}>+ New tracker</button>

      {trackers.length === 0 && (
        <div className="empty-state">
          <p>No trackers yet.</p>
          <p className="empty-state__sub">Track anything you want to see over time: something that comes and goes, a count, a rating, or just whether it happened.</p>
        </div>
      )}

      <ul className="people-list">{normal.map(row)}</ul>

      {hidden.length > 0 && (
        <>
          <button className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setShowPrivate((v) => !v)}>
            {showPrivate ? 'Hide private trackers' : `Show private trackers (${hidden.length})`}
          </button>
          {showPrivate && <ul className="people-list">{hidden.map(row)}</ul>}
        </>
      )}
    </div>
  )
}
