import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Dependency-free code shared with the backend (e.g. XP/level formulas), imported as "@shared/..."
const sharedDir = fileURLToPath(new URL('../backend/src/shared', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": sharedDir
    }
  },
  server: {
    port: 5173,
    fs: {
      // The shared folder lives outside the frontend root, so the dev server must be allowed to serve it
      allow: [searchForWorkspaceRoot(process.cwd()), sharedDir]
    },
    allowedHosts: [
      "localhost",
      "weblercodes.com"
    ],
    proxy: {
      "/api": {
        target: "http://localhost:5500",
        changeOrigin: true,
        secure: false,
      },
      "/media": {
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
