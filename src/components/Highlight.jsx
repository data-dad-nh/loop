import { highlightSegments } from '../utils/search'

// Renders text with the search terms picked out. `maxLen` shows only a
// snippet around the first match for long text.
export default function Highlight({ text, terms, maxLen }) {
  const { segments, leading, trailing } = highlightSegments(text, terms, maxLen)
  return (
    <>
      {leading && '…'}
      {segments.map((seg, i) =>
        seg.match ? (
          <span className="search-mark" key={i}>{seg.text}</span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
      {trailing && '…'}
    </>
  )
}
