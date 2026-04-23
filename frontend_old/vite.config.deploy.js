import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // GitHub Pages uchun '/your-repo-name/' qiling
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Production uchun
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  define: {
    // Environment variables
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  }
})
