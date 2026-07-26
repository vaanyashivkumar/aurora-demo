import React from 'react'
import { createRoot } from 'react-dom/client'
import ReactBadge from './ReactBadge.jsx'

/*
 * React entry point.
 *
 * The existing vanilla console (public/app.js + public/data.js) still runs on its
 * own via the <script> tags in index.html — nothing about it changed. React mounts
 * here, alongside it, so you can build new UI with npm packages.
 *
 * The legacy app exposes helpers on window (e.g. window.AURORA_API, window.AURORA_DATA),
 * so React components can read/drive it. Replace <ReactBadge/> with your own components.
 */
const el = document.getElementById('react-root')
if (el) {
  createRoot(el).render(
    <React.StrictMode>
      <ReactBadge />
    </React.StrictMode>
  )
}
console.log('[Aurora] React root mounted — add components under src/ and `npm install` any package.')
