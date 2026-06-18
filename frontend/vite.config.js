import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, proxy `/api/*` to the FastAPI backend so the frontend can use the
// same relative `/api` base URL it uses in Docker (nginx) and avoid CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
