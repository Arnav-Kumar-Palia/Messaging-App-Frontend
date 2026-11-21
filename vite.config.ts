import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In development the app calls relative /api and /ws URLs and Vite forwards
  // them to the backend, so the browser never makes a cross-origin request.
  const target = env.API_PROXY_TARGET || 'http://localhost:8080'
  const proxy = {
    '/api': { target, changeOrigin: true },
    // Live updates WebSocket (Vite's own HMR socket uses a different path).
    '/ws': { target, changeOrigin: true, ws: true },
  }

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})
