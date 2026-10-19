import { makeId } from './id'

// A list's `items` is a flat array of { id, kind: 'item' | 'heading', text, done }.
// Headings are section titles and are never checked off or counted.

// Turns pasted text into items. One line per item; "# Clothes" makes a
// heading; list markers (-, *, bullets, "1.", "[ ]") are stripped, so lists
// copied from notes apps or documents come across clean.
export function parseItems(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const heading = line.match(/^#{1,6}(?:\s+(.*))?$/)
      if (heading) return { kind: 'heading', text: (heading[1] ?? '').trim() }
      // A marker is a bullet or number followed by a space, or alone on the line.
      return { kind: 'item', text: line.replace(/^(?:[-*•–](?:\s+|$)|\d+[.)](?:\s+|$)|\[[ xX]?\]\s*)+/, '').trim() }
    })
    .filter((i) => i.text)
}

export function withIds(parsed) {
  return parsed.map((i) => ({ id: makeId(), kind: i.kind, text: i.text, done: false }))
}

export function progress(items = []) {
  const real = items.filter((i) => i.kind !== 'heading')
  return { done: real.filter((i) => i.done).length, total: real.length }
}

// Index of the next step to do: the first unchecked item.
export function nextStepIndex(items = []) {
  return items.findIndex((i) => i.kind !== 'heading' && !i.done)
}

export function lastDoneIndex(items = []) {
  for (let i = items.length - 1; i >= 0; i--) if (items[i].kind !== 'heading' && items[i].done) return i
  return -1
}

// The heading a step sits under, if any.
export function sectionFor(items = [], index) {
  for (let i = index; i >= 0; i--) if (items[i].kind === 'heading') return items[i].text
  return ''
}

export function resetItems(items = []) {
  return items.map((i) => (i.done ? { ...i, done: false } : i))
}

export function moveItem(items, index, direction) {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
