import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps all asset URLs relative, so the built site works both at a
// domain root and under a subpath like GitHub Pages (/aurora-demo/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: true },
})
