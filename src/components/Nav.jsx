const TABS = [
  { id: 'now', label: 'Now', icon: NowIcon },
  { id: 'tasks', label: 'Tasks', icon: TasksIcon },
  { id: 'focus', label: 'Focus', icon: FocusIcon },
  { id: 'log', label: 'Log', icon: LogIcon },
]

export default function Nav({ active, onChange }) {
  return (
    <nav className="nav">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            className={`nav__item${isActive ? ' nav__item--active' : ''}`}
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function NowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4l2.6 2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.5 7h15M4.5 12h15M4.5 17h9" strokeLinecap="round" />
      <path d="M4 7l.01.01M4 12l.01.01M4 17l.01.01" strokeLinecap="round" />
    </svg>
  )
}
function FocusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3.5h9l4.5 4.5v12.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-16a1 1 0 011-1z" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6" strokeLinecap="round" />
    </svg>
  )
}
