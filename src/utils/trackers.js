// A tracker is a name plus the details you record each time. Each detail
// ("field") has a type. An entry is a time, the detail values, and a note.
//   tracker: { id, name, private, fields: [{ id, label, type, options? }] }
//   entry:   { id, trackerId, at (ISO), values: { [fieldId]: value }, note }

export const FIELD_TYPES = [
  { id: 'number', label: 'Number' },
  { id: 'rating', label: 'Rating (1–5)' },
  { id: 'choice', label: 'Choice' },
  { id: 'yesno', label: 'Yes / No' },
]

// "chin, forehead\ncheek" -> ['chin', 'forehead', 'cheek']
export function parseOptions(text) {
  const seen = new Set()
  const out = []
  for (const part of String(text ?? '').split(/[,\n]/)) {
    const option = part.trim()
    if (option && !seen.has(option.toLowerCase())) {
      seen.add(option.toLowerCase())
      out.push(option)
    }
  }
  return out
}

// Keeps only values that make sense for each field's type; blanks are dropped.
export function cleanValues(fields = [], raw = {}) {
  const out = {}
  for (const f of fields) {
    const v = raw[f.id]
    if (v === undefined || v === null || v === '') continue
    if (f.type === 'number') {
      const n = Number(v)
      if (Number.isFinite(n)) out[f.id] = n
    } else if (f.type === 'rating') {
      const n = Math.round(Number(v))
      if (n >= 1 && n <= 5) out[f.id] = n
    } else if (f.type === 'choice') {
      if ((f.options ?? []).includes(v)) out[f.id] = v
    } else if (f.type === 'yesno') {
      if (typeof v === 'boolean') out[f.id] = v
    }
  }
  return out
}

// One line summing up an entry, e.g. "Count 3 · Severity 2/5 · chin".
export function describeEntry(tracker, entry) {
  const parts = []
  for (const f of tracker.fields ?? []) {
    const v = entry.values?.[f.id]
    if (v === undefined) continue
    if (f.type === 'number') parts.push(`${f.label} ${v}`)
    else if (f.type === 'rating') parts.push(`${f.label} ${v}/5`)
    else if (f.type === 'choice') parts.push(String(v))
    else if (f.type === 'yesno') parts.push(`${f.label}: ${v ? 'yes' : 'no'}`)
  }
  return parts.join(' · ')
}

// ---------- chart data ----------

// Buckets entries into the last `count` days (or weeks, starting Sunday), ending
// with the current one. With no field the value is how many entries; with a
// number field it is the total; with a rating field it is the average (null
// for an empty bucket, so gaps stay gaps).
export function bucketSeries({ entries, field = null, bucket = 'day', count = 14, now = new Date() }) {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const metric = !field ? 'count' : field.type === 'number' ? 'sum' : field.type === 'rating' ? 'avg' : 'count'

  const buckets = []
  for (let i = count - 1; i >= 0; i--) {
    const start = bucket === 'week' ? new Date(y, m, d - now.getDay() - 7 * i) : new Date(y, m, d - i)
    const end =
      bucket === 'week' ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) : new Date(y, m, d - i + 1)
    const inside = entries.filter((e) => {
      const t = new Date(e.at).getTime()
      return t >= start.getTime() && t < end.getTime()
    })
    let value
    if (metric === 'count') value = inside.length
    else {
      const nums = inside.map((e) => e.values?.[field.id]).filter((v) => typeof v === 'number')
      if (metric === 'sum') value = nums.reduce((a, b) => a + b, 0)
      else value = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
    }
    buckets.push({ start, label: `${start.getMonth() + 1}/${start.getDate()}`, value, n: inside.length })
  }
  return { metric, buckets }
}

// ---------- export ----------

const pad = (n) => String(n).padStart(2, '0')
const stamp = (iso) => {
  const t = new Date(iso)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`
}

// Text that starts with = + - @ can run as a formula when opened in a
// spreadsheet, so those cells get a leading apostrophe.
const safeText = (s) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s)
const cell = (s) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export function entriesToCsv(tracker, entries) {
  const fields = tracker.fields ?? []
  const header = ['When', ...fields.map((f) => safeText(f.label)), 'Note'].map(cell).join(',')
  const rows = [...entries]
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .map((e) => {
      const values = fields.map((f) => {
        const v = e.values?.[f.id]
        if (v === undefined) return ''
        if (f.type === 'yesno') return v ? 'Yes' : 'No'
        if (f.type === 'choice') return safeText(String(v))
        return String(v)
      })
      return [stamp(e.at), ...values, safeText(e.note ?? '')].map(cell).join(',')
    })
  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`
}

export const csvFileName = (name) =>
  `${String(name || 'tracker').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tracker'}.csv`

// Opens the phone's share sheet where it can (Save to Files, AirDrop, ...),
// otherwise downloads the file.
export async function shareOrDownload(filename, text, mime = 'text/csv') {
  const file = new File([text], filename, { type: mime })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
