import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The frontend talks to the FastAPI backend on :8787. In dev we proxy /api so
// the browser sees a single origin (no CORS preflight noise).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
