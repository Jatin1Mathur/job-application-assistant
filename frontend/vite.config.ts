import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // The browser only talks to this dev server; /api calls are passed on to the Spring Boot backend.
    // Because the browser never calls port 8080 directly, the backend needs no CORS settings.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // AI requests are slow, so wait up to 5 minutes before giving up
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
    },
  },
})
