import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { extractActionItems, geminiEnabled } from '../gemini'
import CommEntryRow, { TYPES } from './CommEntryRow'
import PersonTimeline from './PersonTimeline'

function EntryForm() {
  const { addCommEntry, findOrCreatePerson } = useAppData()
  const [type, setType] = useState('call')
  const [personName, setPersonName] = useState('')
  const [summary, setSummary] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!summary.trim()) return
    const person = personName.trim() ? findOrCreatePerson(personName.trim()) : null

    let actionItems = []
    if (geminiEnabled && summary.trim().length > 8) {
      setExtracting(true)
      setError('')
      try {
        const items = await extractActionItems(summary.trim())
        actionItems = items.map((text, i) => ({ id: `ai-${Date.now()}-${i}`, text, done: false, taskId: null }))
      } catch (err) {
        setError('Action-item extraction skipped — ' + err.message)
      } finally {
        setExtracting(false)
      }
    }

    addCommEntry({
      type,
      personId: person?.id ?? null,
      summary: summary.trim(),
      actionItems,
      linkedTaskId: null,
    })

    setSummary('')
    setPersonName('')
  }

  return (
    <form className="comm-form" onSubmit={handleSubmit}>
      <div className="comm-form__types">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`chip${type === t.id ? ' chip--active' : ''}`}
            onClick={() => setType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        className="comm-form__person"
        type="text"
        placeholder="Who was it with?"
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
      />
      <textarea
        className="comm-form__summary"
        placeholder="What happened? (tap the mic on your keyboard to dictate)"
        rows={3}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <button className="btn btn--primary" type="submit" disabled={!summary.trim() || extracting}>
        {extracting ? 'Logging…' : 'Log it'}
      </button>
      {error && <p className="capture__error">{error}</p>}
    </form>
  )
}

export default function CommLog() {
  const { commLog, people } = useAppData()
  const [view, setView] = useState('entries')
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const personName = (id) => people.find((p) => p.id === id)?.name

  const sorted = [...commLog].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const entryCountFor = (personId) => commLog.filter((e) => e.personId === personId).length

  return (
    <div className="screen">
      <div className="comm-form__types" style={{ marginBottom: 4 }}>
        <button className={`chip${view === 'entries' ? ' chip--active' : ''}`} onClick={() => setView('entries')}>Entries</button>
        <button className={`chip${view === 'people' ? ' chip--active' : ''}`} onClick={() => setView('people')}>People</button>
      </div>

      {view === 'entries' && (
        <>
          <EntryForm />
          {sorted.length === 0 && (
            <div className="empty-state">
              <p>Nothing logged yet.</p>
              <p className="empty-state__sub">Right after a call or email, jot the gist here before it slips.</p>
            </div>
          )}
          <ul className="comm-list">
            {sorted.map((entry) => (
              <CommEntryRow key={entry.id} entry={entry} personName={personName(entry.personId)} />
            ))}
          </ul>
        </>
      )}

      {view === 'people' && !selectedPersonId && (
        <ul className="people-list">
          {people.length === 0 && (
            <div className="empty-state">
              <p>No one logged yet.</p>
              <p className="empty-state__sub">People are added automatically when you name them in a task or log entry.</p>
            </div>
          )}
          {people.map((p) => (
            <li key={p.id}>
              <button className="people-row" onClick={() => setSelectedPersonId(p.id)}>
                <span className="people-row__name">{p.name}</span>
                <span className="people-row__count">{entryCountFor(p.id)} logged</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {view === 'people' && selectedPersonId && (
        <PersonTimeline personId={selectedPersonId} onBack={() => setSelectedPersonId(null)} />
      )}
    </div>
  )
}
