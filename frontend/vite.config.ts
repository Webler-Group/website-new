import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
    },
  },
})
