import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    // Dev proxy: forwards /api calls to the local FastAPI backend.
    // This avoids CORS issues during development without changing api.ts.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Raise the chunk size warning threshold slightly for recharts
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendor libs into separate chunks for better caching
        // manualChunks must be a function in Vite 8 / Rollup updated types
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react'
          if (id.includes('node_modules/recharts')) return 'recharts'
          if (id.includes('node_modules/lucide-react')) return 'lucide'
        }
      }
    }
  }
})
