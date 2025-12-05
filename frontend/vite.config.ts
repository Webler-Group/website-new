import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      "weblercodes.com"
    ],
    proxy: {
      "/api": {
        target: "http://localhost:5500",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:5500",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:5500",
        changeOrigin: true,
        ws: true,
        secure: false,
      }
    },
  },
})
