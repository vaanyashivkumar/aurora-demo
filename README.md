# Aurora Demo — Vite + React branch

This is the `vite-react` branch of the Aurora clinical console demo. It's the **same UI** as `main`,
but restructured into a **Vite project** so you can use **npm packages and React components**.

> The `main` branch is the original zero-build static site (plain HTML/CSS/JS) and is what the live
> GitHub Pages link serves. This branch is for developing with the React/npm ecosystem.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Build a static bundle (for deploying anywhere, incl. GitHub Pages):

```bash
npm run build    # outputs to dist/
npm run preview  # serve the built dist/ locally
```

## How it's wired

The original vanilla app is untouched — it lives in **`public/`** (`app.js`, `data.js`, `styles.css`,
`gsap.min.js`, `ScrollTrigger.min.js`) and loads via classic `<script>` tags in `index.html`, exactly as
before. Vite serves `public/` verbatim, so load order and the app's global functions (used by inline
`onclick` handlers) keep working.

**React is added alongside it**, mounted from `src/`:

```
index.html            Vite entry — legacy <script>s + <div id="react-root"> + module script
public/               the original app, served as-is (app.js has the backend integration seam)
src/
  main.jsx            React root (createRoot on #react-root)
  ReactBadge.jsx      example component — delete when you add your own
vite.config.js        base:'./', @vitejs/plugin-react
```

## Using npm packages / React

Just install and import in anything under `src/`:

```bash
npm install axios recharts   # or whatever you need
```

```jsx
// src/SomeChart.jsx
import { LineChart, Line } from 'recharts'
export default function SomeChart({ data }) { /* ... */ }
```

The legacy app exposes hooks on `window` (e.g. `window.AURORA_API`, `window.AURORA_DATA`), so React
components can read from or drive the existing console. Over time you can migrate views into React by
rendering them into their own mount points.

## Backend integration

Unchanged from `main` — see **[INTEGRATION.md](INTEGRATION.md)** for the FastAPI `/prediction/upload`
contract, per-model table, and the `AURORA_API.BASE_URL` switch (still in `public/app.js`).
