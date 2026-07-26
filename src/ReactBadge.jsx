import React, { useState } from 'react'

/*
 * Example React component — proof that React + npm packages work in this project.
 * It renders a small dismissible pill in the corner. Safe to delete once you start
 * building your own components.
 */
export default function ReactBadge() {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <div
      style={{
        position: 'fixed', left: 14, bottom: 14, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderRadius: 999,
        font: '500 12px/1 system-ui, -apple-system, sans-serif', color: '#0b3b39',
        background: 'rgba(15,157,148,.12)', border: '1px solid rgba(15,157,148,.35)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <span>⚛ React is live</span>
      <button
        onClick={() => setHidden(true)}
        aria-label="Dismiss"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontSize: 15, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  )
}
