import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { geminiEnabled, parseTaskFromText } from '../gemini'

// The single most important interaction in the app: capture a thought in
// one tap, with zero forced categorization. Everything else (due date,
// duration, who it's linked to) is optional and collapsed by default.
export default function TaskCapture() {
  const { addTask, findOrCreatePerson } = useAppData()
  const [text, setText] = useState('')
  const [useAI, setUseAI] = useState(geminiEnabled)
  const [showDetails, setShowDetails] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [minutes, setMinutes] = useState('')
  const [personName, setPersonName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const manualDueAt = dueDate ? new Date(`${dueDate}T${dueTime || '09:00'}`).toISOString() : null

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError('')

    let title = trimmed
    let dueAt = manualDueAt
    let estimatedMinutes = minutes ? Number(minutes) : null

    if (useAI && geminiEnabled) {
      try {
        const parsed = await parseTaskFromText(trimmed)
        title = parsed.title || trimmed
        dueAt = manualDueAt || parsed.dueAt || null
        estimatedMinutes = estimatedMinutes ?? parsed.estimatedMinutes ?? null
      } catch (err) {
        setError('AI parse failed, added as plain text — ' + err.message)
      }
    }

    const person = personName.trim() ? findOrCreatePerson(personName.trim()) : null

    addTask({
      title,
      notes: '',
      dueAt,
      estimatedMinutes,
      completed: false,
      completedAt: null,
      linkedPersonId: person?.id ?? null,
      steps: [],
    })

    setText('')
    setDueDate('')
    setDueTime('')
    setMinutes('')
    setPersonName('')
    setShowDetails(false)
    setBusy(false)
  }

  return (
    <form className="capture" onSubmit={handleSubmit}>
      <div className="capture__row">
        <input
          className="capture__input"
          type="text"
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          enterKeyHint="done"
        />
        <button className="capture__submit" type="submit" disabled={!text.trim() || busy} aria-label="Add task">
          {busy ? '…' : '+'}
        </button>
      </div>

      <div className="capture__controls">
        {geminiEnabled && (
          <button
            type="button"
            className={`chip${useAI ? ' chip--active' : ''}`}
            onClick={() => setUseAI((v) => !v)}
          >
            ✦ AI parse
          </button>
        )}
        <button type="button" className="chip" onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? 'Hide details' : '+ Details'}
        </button>
      </div>

      {showDetails && (
        <div className="capture__details">
          <label className="field">
            <span>Due</span>
            <div className="field__row">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </label>
          <label className="field">
            <span>Takes about (min)</span>
            <input type="number" min="1" placeholder="15" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
          <label className="field">
            <span>Linked to</span>
            <input type="text" placeholder="Person's name" value={personName} onChange={(e) => setPersonName(e.target.value)} />
          </label>
        </div>
      )}

      {error && <p className="capture__error">{error}</p>}
    </form>
  )
}
