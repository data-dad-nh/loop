// Search is plain text matching over data that is already on the device, so it
// works offline and instantly. Matching ignores capitals, accents, and curly
// vs straight apostrophes, and EVERY word you type must appear somewhere in an
// item ("landlord lease" finds notes containing both, in any order).

// Folds text to a comparable form, keeping track of where each folded
// character came from so matches can be highlighted in the original text.
export function foldWithMap(text) {
  const s = String(text ?? '')
  let folded = ''
  const starts = []
  const ends = []
  let i = 0
  for (const ch of s) {
    const f = ch
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
    for (let k = 0; k < f.length; k++) {
      starts.push(i)
      ends.push(i + ch.length)
    }
    folded += f
    i += ch.length
  }
  return { folded, starts, ends }
}

export const fold = (text) => foldWithMap(text).folded

export function parseTerms(query) {
  return fold(query).split(/\s+/).filter(Boolean)
}

const hasAll = (haystack, terms) => {
  const h = fold(haystack)
  return terms.every((t) => h.includes(t))
}

const byDueThenNewest = (a, b) => {
  const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
  const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
  return aDue - bDue
}

export function searchAll({ tasks, commLog, people, procedures = [] }, query, limit = 50) {
  const terms = parseTerms(query)
  if (!terms.length) {
    return { terms, entries: [], people: [], lists: [], tasks: [], totals: { entries: 0, people: 0, lists: 0, tasks: 0 } }
  }

  const nameOf = new Map(people.map((p) => [p.id, p.name]))
  const name = (id) => nameOf.get(id) ?? ''

  // Calls, texts and emails come first. The type and the person's name are
  // searchable too, so "email landlord" finds emails involving the landlord.
  const entries = commLog
    .filter((e) =>
      hasAll([e.type, name(e.personId), e.summary, ...(e.actionItems ?? []).map((i) => i.text)].join('\n'), terms)
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const matchedPeople = people.filter((p) => hasAll(p.name, terms)).sort((a, b) => a.name.localeCompare(b.name))

  // Reusable lists match on their name or any item or heading in them.
  const matchedLists = procedures
    .filter((l) => hasAll([l.title, ...(l.items ?? []).map((i) => i.text)].join('\n'), terms))
    .sort((a, b) => a.title.localeCompare(b.title))

  const matchedTasks = tasks.filter((t) =>
    hasAll([t.title, t.notes, name(t.linkedPersonId), ...(t.steps ?? []).map((s) => s.text)].join('\n'), terms)
  )
  const open = matchedTasks.filter((t) => !t.completed).sort(byDueThenNewest)
  const done = matchedTasks
    .filter((t) => t.completed)
    .sort((a, b) => new Date(b.completedAt ?? 0) - new Date(a.completedAt ?? 0))
  const orderedTasks = [...open, ...done]

  return {
    terms,
    entries: entries.slice(0, limit),
    people: matchedPeople.slice(0, limit),
    lists: matchedLists.slice(0, limit),
    tasks: orderedTasks.slice(0, limit),
    totals: { entries: entries.length, people: matchedPeople.length, lists: matchedLists.length, tasks: orderedTasks.length },
  }
}

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const out = []
  for (const [a, b] of sorted) {
    const last = out[out.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

// Splits `text` into pieces, flagging the ones that match a search term. For
// long text, returns just a window around the first match (with a flag for
// each side that was cut off).
export function highlightSegments(text, terms, maxLen = Infinity) {
  const s = String(text ?? '')
  const { folded, starts, ends } = foldWithMap(s)

  const found = []
  for (const term of terms) {
    if (!term) continue
    let from = 0
    for (;;) {
      const at = folded.indexOf(term, from)
      if (at === -1) break
      found.push([at, at + term.length])
      from = at + term.length
    }
  }
  const ranges = mergeRanges(found.map(([a, b]) => [starts[a], ends[b - 1]]))

  let winStart = 0
  let winEnd = s.length
  if (s.length > maxLen) {
    winStart = ranges.length ? Math.max(0, ranges[0][0] - Math.floor(maxLen * 0.3)) : 0
    winEnd = Math.min(s.length, winStart + maxLen)
    // Snap to nearby word boundaries so the snippet doesn't start or end mid-word.
    const before = s.lastIndexOf(' ', winStart)
    if (winStart > 0 && before >= 0 && winStart - before < 20) winStart = before + 1
    const after = s.indexOf(' ', winEnd)
    if (winEnd < s.length && after >= 0 && after - winEnd < 20) winEnd = after
  }

  const segments = []
  let cursor = winStart
  for (const [a, b] of ranges) {
    if (b <= winStart || a >= winEnd) continue
    const from = Math.max(a, winStart)
    const to = Math.min(b, winEnd)
    if (from > cursor) segments.push({ text: s.slice(cursor, from), match: false })
    segments.push({ text: s.slice(from, to), match: true })
    cursor = to
  }
  if (cursor < winEnd) segments.push({ text: s.slice(cursor, winEnd), match: false })

  return { segments, leading: winStart > 0, trailing: winEnd < s.length }
}
