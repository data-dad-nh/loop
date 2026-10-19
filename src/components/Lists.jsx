import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { progress } from '../utils/lists'
import ListDetail from './ListDetail'
import ListEditor from './ListEditor'

// Reusable lists you run through again and again (packing, camping, closing
// up the house). The list that is open is owned by App, so search can jump
// straight to one.
export default function Lists({ openListId, onOpenList }) {
  const { procedures, addProcedure } = useAppData()
  const [creating, setCreating] = useState(false)
  const open = procedures.find((p) => p.id === openListId)

  if (creating) {
    return (
      <div className="screen">
        <ListEditor
          list={null}
          onCancel={() => setCreating(false)}
          onSave={(draft) => {
            const created = addProcedure(draft)
            setCreating(false)
            onOpenList(created.id)
          }}
        />
      </div>
    )
  }

  if (open) return <ListDetail list={open} onBack={() => onOpenList(null)} />

  const sorted = [...procedures].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))

  return (
    <div className="screen">
      <button className="btn btn--primary" style={{ alignSelf: 'flex-start' }} onClick={() => setCreating(true)}>+ New list</button>

      {sorted.length === 0 && (
        <div className="empty-state">
          <p>No lists yet.</p>
          <p className="empty-state__sub">Make one for packing, camping, or anything you do the same way each time. You can paste in a list you already have.</p>
        </div>
      )}

      <ul className="people-list">
        {sorted.map((p) => {
          const { done, total } = progress(p.items)
          const pct = total ? Math.round((done / total) * 100) : 0
          return (
            <li key={p.id}>
              <button className="people-row list-card" onClick={() => onOpenList(p.id)}>
                <span className="list-card__main">
                  <span className="people-row__name">{p.title}</span>
                  <span className="list-card__sub">
                    {p.ordered ? 'Step by step' : 'Checklist'} · {total === 0 ? 'empty' : done === 0 ? `${total} items` : `${done} of ${total} done`}
                  </span>
                  {done > 0 && (
                    <span className="progress progress--thin"><span className="progress__bar" style={{ width: `${pct}%` }} /></span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
