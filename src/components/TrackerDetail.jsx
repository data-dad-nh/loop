import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useTimeRefresh } from '../hooks/useTimeRefresh'
import { bucketSeries, cleanValues, csvFileName, describeEntry, entriesToCsv, shareOrDownload } from '../utils/trackers'
import { toDateTimeInputValue } from '../utils/time'
import EntryEditor from './EntryEditor'
import FieldInput from './FieldInput'
import TrackerChart from './TrackerChart'
import TrackerEditor from './TrackerEditor'

function dayHeading(date) {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

// One tracker: log something, see the pattern, look back.
export default function TrackerDetail({ tracker, onBack }) {
  const { trackerEntries, addTrackerEntry, updateTracker, removeTracker } = useAppData()
  const timeVersion = useTimeRefresh() // "Today" and the chart move on at midnight
  const [values, setValues] = useState({})
  const [note, setNote] = useState('')
  const [whenOpen, setWhenOpen] = useState(false)
  const [when, setWhen] = useState('')
  const [editingTracker, setEditingTracker] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [bucket, setBucket] = useState('day')
  const [metric, setMetric] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!status) return
    const id = setTimeout(() => setStatus(''), 2500)
    return () => clearTimeout(id)
  }, [status])

  const entries = useMemo(
    () => trackerEntries.filter((e) => e.trackerId === tracker.id).sort((a, b) => new Date(b.at) - new Date(a.at)),
    [trackerEntries, tracker.id]
  )
  const fields = tracker.fields ?? []
  const metricFields = fields.filter((f) => f.type === 'number' || f.type === 'rating')
  const field = metricFields.find((f) => f.id === metric) ?? null
  const series = useMemo(
    () => bucketSeries({ entries, field, bucket, count: bucket === 'day' ? 14 : 8 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, field, bucket, timeVersion]
  )

  function log(e) {
    e.preventDefault()
    addTrackerEntry(tracker.id, {
      at: whenOpen && when ? new Date(when).toISOString() : new Date().toISOString(),
      values: cleanValues(fields, values),
      note: note.trim(),
    })
    setValues({})
    setNote('')
    setWhenOpen(false)
    setWhen('')
    setStatus('Logged')
  }

  async function exportCsv() {
    const result = await shareOrDownload(csvFileName(tracker.name), entriesToCsv(tracker, entries))
    if (result === 'downloaded') setStatus('Downloaded')
  }

  if (editingTracker) {
    return (
      <div className="screen">
        <TrackerEditor
          tracker={tracker}
          onCancel={() => setEditingTracker(false)}
          onSave={(draft) => {
            updateTracker(tracker.id, { name: draft.name, fields: draft.fields })
            setEditingTracker(false)
          }}
          onDelete={() => {
            removeTracker(tracker.id)
            onBack()
          }}
        />
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="list-head">
        <button className="btn btn--ghost" onClick={onBack}>← Track</button>
        <button className="btn btn--ghost" onClick={() => setEditingTracker(true)}>Edit</button>
      </div>
      <h1 className="list-title">{tracker.name}</h1>
      {tracker.private && (
        <p className="repeat__hint">Private: stays on this device only. Not synced and not searchable.</p>
      )}

      <form className="comm-form" onSubmit={log}>
        {fields.map((f) => (
          <div className="field" key={f.id}>
            <span>{f.label}</span>
            <FieldInput field={f} value={values[f.id]} onChange={(v) => setValues((cur) => ({ ...cur, [f.id]: v }))} />
          </div>
        ))}
        <textarea
          className="comm-form__summary"
          rows={2}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {whenOpen && (
          <label className="field">
            <span>When</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
        )}
        <div className="comm-form__types">
          <button type="submit" className="btn btn--primary">Log it</button>
          <button
            type="button"
            className="chip"
            onClick={() => {
              if (!whenOpen) setWhen(toDateTimeInputValue(new Date().toISOString()))
              setWhenOpen((v) => !v)
            }}
          >
            {whenOpen ? 'Use now' : 'Different time'}
          </button>
        </div>
        <p className="tracker-status" role="status">{status}</p>
      </form>

      {entries.length > 0 && (
        <section>
          <div className="comm-form__types">
            <button className={`chip${bucket === 'day' ? ' chip--active' : ''}`} aria-pressed={bucket === 'day'} onClick={() => setBucket('day')}>Days</button>
            <button className={`chip${bucket === 'week' ? ' chip--active' : ''}`} aria-pressed={bucket === 'week'} onClick={() => setBucket('week')}>Weeks</button>
            {metricFields.length > 0 && (
              <select className="focus__task-select" aria-label="Chart shows" value={metric} onChange={(e) => setMetric(e.target.value)}>
                <option value="">Number of entries</option>
                {metricFields.map((f) => (
                  <option key={f.id} value={f.id}>{f.type === 'rating' ? `${f.label} (average)` : `${f.label} (total)`}</option>
                ))}
              </select>
            )}
          </div>
          <TrackerChart series={series} unit={field ? field.label : 'entries'} />
        </section>
      )}

      {entries.length === 0 ? (
        <div className="empty-state">
          <p>Nothing logged yet.</p>
          <p className="empty-state__sub">Log the first one above. You can always add a note or change the time later.</p>
        </div>
      ) : (
        <ul className="comm-list">
          {entries.map((entry, i) => {
            const at = new Date(entry.at)
            const newDay = i === 0 || new Date(entries[i - 1].at).toDateString() !== at.toDateString()
            return (
              <li key={entry.id}>
                {newDay && <h2 className="task-section__heading">{dayHeading(at)}</h2>}
                <button className="comm-row search__result" onClick={() => setEditingEntry(entry)}>
                  <span className="comm-row__head">
                    <span className="comm-row__type">{at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    <span className="comm-row__person">{describeEntry(tracker, entry) || 'Logged'}</span>
                  </span>
                  {entry.note && <span className="comm-row__summary">{entry.note}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {entries.length > 0 && (
        <button className="btn btn--ghost" style={{ alignSelf: 'flex-start' }} onClick={exportCsv}>Export as spreadsheet (CSV)</button>
      )}

      {editingEntry && <EntryEditor tracker={tracker} entry={editingEntry} onClose={() => setEditingEntry(null)} />}
    </div>
  )
}
