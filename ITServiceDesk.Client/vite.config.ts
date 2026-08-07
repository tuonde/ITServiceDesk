import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs
    proxy: {
      '/api': {
        target: 'http://localhost:5014',
        changeOrigin: true
      },
      '/ticketHub': {
        target: 'http://localhost:5014',
        ws: true
      },
      '/notificationHub': {
        target: 'http://localhost:5014',
        ws: true
      },
      '/uploads': {
        target: 'http://localhost:5014',
        changeOrigin: true
      }
    }
  }
})
