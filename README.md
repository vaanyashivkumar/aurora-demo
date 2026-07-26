# Aurora AI — Clinical Console (demo)

A standalone demo of a doctor-facing brain-MRI AI console: upload MRI studies, run
validated AI models — including two new PyTorch models, **End-to-End CNN** and **Model 1 CNN** —
and read explainable results. Runs on mock data, so no login or backend is required.

**▶ Live demo:** https://vaanyashivkumar.github.io/aurora-demo/

---

## Two versions of this project

| Branch | Stack | Use it for |
|--------|-------|------------|
| **`main`** (this branch) | Plain HTML/CSS/JS, zero build step | The live site above — just open `index.html`. |
| **`vite-react`** | **Vite + React** — full npm ecosystem | Building on it with React components and npm packages. |

### ⚛ Want React & npm package support? → use the `vite-react` branch

Same UI, restructured as a Vite project so `npm install <anything>` and React components work:

```bash
git clone -b vite-react https://github.com/vaanyashivkumar/aurora-demo.git
cd aurora-demo
npm install
npm run dev      # http://localhost:5173
```

The original vanilla app is untouched there (it lives in `public/` and still loads as-is);
React is mounted alongside it from `src/`. See the `README.md` on the `vite-react` branch for details.

---

## Connecting the real backend

Both branches include a dormant integration seam for the FastAPI model backend
(`POST /prediction/upload`). See **[INTEGRATION.md](INTEGRATION.md)** for the exact request/response
contract, the per-model reference table, and the `AURORA_API.BASE_URL` switch that turns the real
backend on (it defaults to a simulated result so the demo always works standalone).

---

## Tech

Vanilla HTML / CSS / JavaScript single-page app, GSAP for animations, deployed on GitHub Pages.
The `vite-react` branch adds Vite + React on top without changing the UI.
