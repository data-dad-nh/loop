import { useState } from 'react'
import { geminiEnabled, rewriteNote } from '../gemini'

// Sits under a note field. Shows a preview of the AI result first, so a
// rambling dictated note is never overwritten until you choose to replace it.
export default function NoteAssist({ value, onApply }) {
  const [busy, setBusy] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  if (!geminiEnabled) return null
  const hasText = value.trim().length > 0

  async function run(mode) {
    setBusy(mode)
    setError('')
    setResult(null)
    try {
      const text = await rewriteNote(value, mode)
      setResult({ mode, text })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="note-assist">
      <div className="note-assist__buttons">
        <button type="button" className="chip" disabled={!hasText || busy !== null} onClick={() => run('summary')}>
          {busy === 'summary' ? 'Summarizing…' : '✦ Summarize'}
        </button>
        <button type="button" className="chip" disabled={!hasText || busy !== null} onClick={() => run('bullets')}>
          {busy === 'bullets' ? 'Working…' : '✦ Bullets'}
        </button>
      </div>

      {error && <p className="capture__error">{error}</p>}

      {result && (
        <div className="note-assist__preview">
          <p className="note-assist__label">{result.mode === 'bullets' ? 'As bullets' : 'Summary'}</p>
          <p className="note-assist__text">{result.text}</p>
          <div className="sheet__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setResult(null)}>Discard</button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onApply(result.text)
                setResult(null)
              }}
            >
              Replace note
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
